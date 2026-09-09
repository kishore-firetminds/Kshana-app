# KshanaAPI brand assets

Vector masters copied from `C:/Users/kisho/Downloads/KshanaAPI-Brand/SVG`.
Run `npm run brand:build` to regenerate platform PNGs and React Native density variants.

- Primary logo: login, 280 logical pixels wide with its original aspect ratio.
- No-tagline logo: app and drawer headers, up to 180 logical pixels wide; shrinks to available space.
- White and monochrome wordmarks: supplied variants available through `BrandLogo` for appropriate surfaces.
- All in-app logos: 1x, 2x and 3x exports selected automatically by React Native.
- App icon: 1024 x 1024, opaque square canvas; operating systems apply their corner masks.
- Android adaptive foreground and monochrome: 1024 x 1024 transparent canvases, padded to protect the bubble tail within the safe circle.
- Notification icon: 96 x 96 white artwork on transparency.
- Splash: 512 x 512 transparent icon, displayed at 160 logical pixels.

Artwork paths and brand colors come from the provided vector masters. Monochrome system icons use the same paths with white fill. Changes to launcher, splash and notification resources require a new native build.
