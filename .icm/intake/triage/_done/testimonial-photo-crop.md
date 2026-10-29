# Stub: A testimonial photo cuts off Diogo's face

- lane: bug
- found-by: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`) · 2026-10-23
- complexity: low
- priority: P2

## Problem

`public/images/testimonials/madeline-and-elliot.jpg` is a 768 by 1024 portrait. The testimonials
component forces it into a 4:3 frame with `object-cover` (`web/src/components/testimonials.tsx`
lines 51 to 57), so the top of the image is cut and the face of the person at the top is lost.
The alt text says the photo shows Diogo and Rita. Diogo: "the size of the image is not good,
Diogo's face is outlayer, let me know if other picture is needed".

## Proposed change

Show the photo without cutting a face: an `object-position` at the top, or the image's own
aspect ratio for that card. Ask Diogo for a landscape photo and replace the file when it lands.

## Acceptance criteria

- [ ] On the home page and the Rural Saloia page, every face in the testimonial photos is inside the frame at 375 px and 1280 px width.
- [ ] The other two testimonial photos are unchanged.
