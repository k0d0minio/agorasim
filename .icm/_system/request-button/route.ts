// route.ts — the API route of the request button (blueprint 1.0.0-rc33).
// A client repo adds one file, app/api/baxter-request/route.ts:
//   export { POST } from "<relative path>/.icm/_system/request-button/route";
// It writes one request to the store of the repo (.icm/_system/features/requests.md):
// - markdown, with BAXTER_REQUEST_GITHUB_TOKEN and BAXTER_REQUEST_GITHUB_REPO: a pull request
//   of the branch request/REQ-<slug>-<n> with the record, the capture and the picture;
// - markdown on a local dev server with no token: the three files in .icm/requests/;
// - linear, with BAXTER_REQUEST_LINEAR_API_KEY: one triage ticket in the team, the project
//   and with the labels of linearTarget (core.ts), the capture and the picture as uploads.
// A body {"status": ["JAM-1", ...]} asks for the status of the client's past requests: the
// answer has only the status of each issue with a label of the target.
// The secrets come from the env of the deployment. No secret is in this file.
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import project from "../../project.json";
import { buildRecord, buttonEnv, clientStatus, findProject, linearTarget, nextNumber, oneLine, parseForm, parseKeys, sanitizeCapture } from "./core";
import type { Capture, ClientStatus, RequestForm } from "./core";

type Project = {
  slug: string;
  ticket_source?: string;
  default_branch?: string;
  linear?: { team_key?: string };
  requests?: { store?: string; linear_team?: string; linear_label?: string; linear_project?: string };
};
type Picture = { type: string; ext: string; bytes: Buffer } | null;
type Stored = { id: string; url: string | null };
type Input = { form: RequestForm; capture: Capture; picture: Picture; date: string };

const pj = project as unknown as Project;
const MAX_PICTURE = 6_000_000;

function answer(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

function picture(value: unknown): Picture {
  const match = typeof value === "string" ? /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(value) : null;
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_PICTURE) return null;
  return { type: `image/${match[1]}`, ext: match[1] === "png" ? "png" : "jpg", bytes };
}

export async function POST(request: Request): Promise<Response> {
  const env = buttonEnv(process.env);
  if (!env) return answer(404, { ok: false, error: "the request button is off in this environment" });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return answer(400, { ok: false, error: "the body is not JSON" });
  }
  if (Array.isArray(body.status)) {
    const keys = parseKeys(body.status);
    if (!keys.length || !isLinear() || !process.env.BAXTER_REQUEST_LINEAR_API_KEY) return answer(200, { ok: true, statuses: {} });
    try {
      return answer(200, { ok: true, statuses: await statusFromLinear(keys) });
    } catch (reason) {
      return answer(502, { ok: false, error: oneLine(String(reason)).slice(0, 300) });
    }
  }
  const parsed = parseForm(body.form);
  if ("faults" in parsed) return answer(400, { ok: false, error: parsed.faults.join("; ") });
  const version = process.env.BAXTER_REQUEST_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "unknown";
  const capture = sanitizeCapture(body.capture, { repo: pj.slug, env, version });
  const shot = picture(body.screenshot);
  if (!shot && !capture.screenshot_error) capture.screenshot_error = "no picture";
  const input: Input = { form: parsed.form, capture, picture: shot, date: new Date().toISOString().slice(0, 10) };
  const store = isLinear() ? "linear" : pj.requests?.store ?? ".icm/requests";
  try {
    let stored: Stored;
    if (store === "linear") stored = await toLinear(input);
    else if (process.env.BAXTER_REQUEST_GITHUB_TOKEN) stored = await toGitHub(input);
    else if (env === "local") stored = await toFolder(input);
    else return answer(503, { ok: false, error: "no store: set BAXTER_REQUEST_GITHUB_TOKEN and BAXTER_REQUEST_GITHUB_REPO" });
    return answer(201, { ok: true, ...stored });
  } catch (reason) {
    return answer(502, { ok: false, error: oneLine(String(reason)).slice(0, 300) });
  }
}

// The files of one markdown request, with their names.
function files(id: string, input: Input): { name: string; data: Buffer }[] {
  const shotName = input.picture ? `${id}.${input.picture.ext}` : "";
  const capture: Capture = {
    ...input.capture,
    screenshot: input.picture ? { file: shotName, type: input.picture.type, method: "dom-render" } : null,
  };
  const record = buildRecord({
    id, date: input.date, form: input.form, capture,
    screenshot: shotName || `none: ${capture.screenshot_error ?? "no picture"}`,
    captureFile: `${id}.capture.json`,
  });
  const out: { name: string; data: Buffer }[] = [
    { name: `${id}.md`, data: Buffer.from(record) },
    { name: `${id}.capture.json`, data: Buffer.from(`${JSON.stringify(capture, null, 2)}\n`) },
  ];
  if (input.picture) out.push({ name: shotName, data: input.picture.bytes });
  return out;
}

// A local dev server: the folder .icm/requests/ of the repo.
async function toFolder(input: Input): Promise<Stored> {
  let root = process.cwd();
  while (!existsSync(path.join(root, ".icm", "project.json"))) {
    const up = path.dirname(root);
    if (up === root) throw new Error("no .icm/project.json above the working folder");
    root = up;
  }
  const folder = path.join(root, ".icm", "requests");
  await fs.mkdir(folder, { recursive: true });
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = `REQ-${pj.slug}-${nextNumber(await fs.readdir(folder), pj.slug)}`;
    try {
      for (const file of files(id, input)) await fs.writeFile(path.join(folder, file.name), file.data, { flag: "wx" });
      return { id, url: null };
    } catch (reason) {
      if ((reason as NodeJS.ErrnoException).code !== "EEXIST") throw reason;
    }
  }
  throw new Error("no free request number");
}

async function github<T>(method: string, route: string, body?: unknown): Promise<T> {
  const repo = process.env.BAXTER_REQUEST_GITHUB_REPO;
  if (!repo) throw new Error("BAXTER_REQUEST_GITHUB_REPO is not set");
  const response = await fetch(`https://api.github.com/repos/${repo}${route}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.BAXTER_REQUEST_GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 404 && method === "GET") return [] as T;
  if (!response.ok) throw new Error(`GitHub ${method} ${route}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

// A markdown repo on UAT: one pull request with only files of .icm/requests/.
async function toGitHub(input: Input): Promise<Stored> {
  const base = pj.default_branch || "main";
  const head = await github<{ object: { sha: string } }>("GET", `/git/ref/heads/${base}`);
  const parent = await github<{ tree: { sha: string } }>("GET", `/git/commits/${head.object.sha}`);
  const listed = await github<{ name: string }[]>("GET", `/contents/.icm/requests?ref=${base}`);
  const refs = await github<{ ref: string }[]>("GET", "/git/matching-refs/heads/request/REQ-");
  const names = [...listed.map((f) => f.name), ...refs.map((r) => r.ref)];
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = `REQ-${pj.slug}-${nextNumber(names, pj.slug)}`;
    const tree = [];
    for (const file of files(id, input)) {
      const blob = await github<{ sha: string }>("POST", "/git/blobs", { content: file.data.toString("base64"), encoding: "base64" });
      tree.push({ path: `.icm/requests/${file.name}`, mode: "100644", type: "blob", sha: blob.sha });
    }
    const made = await github<{ sha: string }>("POST", "/git/trees", { base_tree: parent.tree.sha, tree });
    const commit = await github<{ sha: string }>("POST", "/git/commits", {
      message: `request: ${id} from the request button`, tree: made.sha, parents: [head.object.sha],
    });
    try {
      await github("POST", "/git/refs", { ref: `refs/heads/request/${id}`, sha: commit.sha });
    } catch {
      names.push(id); // another request took this number
      continue;
    }
    const pull = await github<{ html_url: string }>("POST", "/pulls", {
      title: `Client request ${id}: ${oneLine(input.form.what).slice(0, 60)}`,
      head: `request/${id}`,
      base,
      body: `A client request from the request button. It has only files of \`.icm/requests/\`.\nThe rules: \`.icm/_system/features/requests.md\`.`,
    });
    return { id, url: pull.html_url };
  }
  throw new Error("no free request number");
}

function isLinear(): boolean {
  return (pj.requests?.store ?? (pj.ticket_source === "linear" ? "linear" : ".icm/requests")) === "linear";
}

function target() {
  return linearTarget(process.env, pj.requests, pj.linear?.team_key);
}

async function linear<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { authorization: process.env.BAXTER_REQUEST_LINEAR_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const out = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!response.ok || out.errors?.length || !out.data) {
    throw new Error(`Linear: ${out.errors?.map((e) => e.message).join("; ") || `HTTP ${response.status}`}`);
  }
  return out.data;
}

async function upload(name: string, type: string, data: Buffer): Promise<string> {
  const made = await linear<{ fileUpload: { uploadFile: { uploadUrl: string; assetUrl: string; headers: { key: string; value: string }[] } } }>(
    "mutation($t:String!,$n:String!,$s:Int!){fileUpload(contentType:$t,filename:$n,size:$s){uploadFile{uploadUrl assetUrl headers{key value}}}}",
    { t: type, n: name, s: data.length },
  );
  const file = made.fileUpload.uploadFile;
  const headers: Record<string, string> = { "content-type": type, "cache-control": "public, max-age=31536000" };
  for (const h of file.headers) headers[h.key] = h.value;
  const put = await fetch(file.uploadUrl, { method: "PUT", headers, body: new Uint8Array(data) });
  if (!put.ok) throw new Error(`Linear upload: HTTP ${put.status}`);
  return file.assetUrl;
}

// A Linear repo: one triage ticket in the team of the target, with its project and labels.
// An unknown team or project stops the request: the client sees the error.
async function toLinear(input: Input): Promise<Stored> {
  if (!process.env.BAXTER_REQUEST_LINEAR_API_KEY) throw new Error("BAXTER_REQUEST_LINEAR_API_KEY is not set");
  const to = target();
  if (!to.team) throw new Error("no Linear team: set requests.linear_team or BAXTER_REQUEST_LINEAR_TEAM");
  type Team = { id: string; states: { nodes: { id: string; type: string }[] } };
  type Label = { id: string; name: string; team: { id: string } | null };
  const found = await linear<{ teams: { nodes: Team[] }; issueLabels: { nodes: Label[] } }>(
    "query($k:String!,$l:[String!]!){teams(first:1,filter:{key:{eq:$k}}){nodes{id states(first:50){nodes{id type}}}} issueLabels(first:50,filter:{name:{in:$l}}){nodes{id name team{id}}}}",
    { k: to.team, l: to.labels },
  );
  const team = found.teams.nodes[0];
  if (!team) throw new Error(`no Linear team ${to.team}`);
  const labelIds: string[] = [];
  for (const name of to.labels) {
    let id = found.issueLabels.nodes.find((l) => l.name === name && (!l.team || l.team.id === team.id))?.id;
    if (!id) {
      const made = await linear<{ issueLabelCreate: { issueLabel: { id: string } } }>(
        "mutation($n:String!,$t:String!){issueLabelCreate(input:{name:$n,teamId:$t}){issueLabel{id}}}",
        { n: name, t: team.id },
      );
      id = made.issueLabelCreate.issueLabel.id;
    }
    labelIds.push(id);
  }
  let projectId: string | undefined;
  if (to.project) {
    // A second query: Linear refuses one query with the states and the projects ("Query too complex").
    const listed = await linear<{ team: { projects: { nodes: { id: string; name: string; slugId: string }[] } } }>(
      "query($t:String!){team(id:$t){projects(first:100){nodes{id name slugId}}}}",
      { t: team.id },
    );
    const project = findProject(listed.team.projects.nodes, to.project);
    if (!project) throw new Error(`no Linear project "${to.project}" in the team ${to.team}`);
    projectId = project.id;
  }
  const shotUrl = input.picture
    ? await upload(`request.${input.picture.ext}`, input.picture.type, input.picture.bytes)
    : "";
  const capture: Capture = {
    ...input.capture,
    screenshot: input.picture ? { file: shotUrl, type: input.picture.type, method: "dom-render" } : null,
  };
  const captureUrl = await upload("request.capture.json", "application/json", Buffer.from(JSON.stringify(capture, null, 2)));
  const description = buildRecord({
    id: null, date: input.date, form: input.form, capture,
    screenshot: shotUrl ? `![screenshot](${shotUrl})` : `none: ${capture.screenshot_error ?? "no picture"}`,
    captureFile: `[capture.json](${captureUrl})`,
  });
  const made = await linear<{ issueCreate: { issue: { identifier: string; url: string } } }>(
    "mutation($i:IssueCreateInput!){issueCreate(input:$i){issue{identifier url}}}",
    {
      i: {
        teamId: team.id,
        title: oneLine(input.form.what).slice(0, 80),
        description,
        labelIds,
        stateId: team.states.nodes.find((s) => s.type === "triage")?.id,
        projectId,
        priority: { high: 2, normal: 3, low: 4 }[input.form.urgency],
      },
    },
  );
  return { id: made.issueCreate.issue.identifier, url: made.issueCreate.issue.url };
}

// The status of each key that is an issue of the target team with a label of the target.
// An other issue, or an unknown key, is not in the answer.
async function statusFromLinear(keys: string[]): Promise<Record<string, ClientStatus>> {
  const to = target();
  const fields = keys.map((_, n) => `i${n}:issue(id:$k${n}){identifier team{key} state{type} labels(first:10){nodes{name}}}`).join(" ");
  const params = keys.map((_, n) => `$k${n}:String!`).join(",");
  const variables = Object.fromEntries(keys.map((k, n) => [`k${n}`, k]));
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { authorization: process.env.BAXTER_REQUEST_LINEAR_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ query: `query(${params}){${fields}}`, variables }),
  });
  if (!response.ok && response.status !== 400) throw new Error(`Linear: HTTP ${response.status}`);
  type Issue = { identifier: string; team: { key: string }; state: { type: string }; labels: { nodes: { name: string }[] } } | null;
  const out = (await response.json()) as { data?: Record<string, Issue> | null };
  const statuses: Record<string, ClientStatus> = {};
  for (const issue of Object.values(out.data ?? {})) {
    if (!issue || issue.team.key !== to.team) continue;
    if (!issue.labels.nodes.some((l) => to.labels.includes(l.name))) continue;
    statuses[issue.identifier] = clientStatus(issue.state.type);
  }
  return statuses;
}
