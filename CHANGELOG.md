# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2021-05-05

### Added

- Auto suggest filename based on texture name
- Auto update mutator name based on type
- Add Grid option on Layers screen, with option to be magnetic to make it
  easier to place a point
- Add support for `shift` + arrows in number fields to step with a stepsize of 10
- Add support for `shift` + arrows in number fields of points
  in the layer screen will step the coordinate with the active gridsize
- Add support for `ctrl/cmd` + arrows in number fields to step with a stepsize of 100
- "Export for web" option in the file menu, that will save the file but minify all
  internal layer/mutation names, to reduce filesize

### Fixed

- Adding/Removing control from animation frame is now more responsive
- Keep control value on renaming control
- Open Recent now works on mac

## [1.1.0] - 2021-04-27

### Added

- Ability to move from frame to frame in the animation screen

### Changed

- Set maximum height for control list
- Set maximum steps for control to 10 (was 20)

### Fixed

- Number fields that are emptied crashed the application
- Provided more clear 'icon' for the copy layer action
- Renaming control did not update control used in animation frames
- Reducing steps of control did not reduce control values used in animations

## [1.0.0] - 2021-04-18

On the 18th of January 2021 I started with a project to allow myself to create animated scenery and characters using drawn images. In the past 3 months I learned a lot about WebGL, electron and drawing for animations. I'm really happy with the minimal viable product I have now, so today I'm making the release official.

Of course there are improvements to be made (there always are) but for a first release, the current state should be fine 😊

I would like to extend special thanks to my colleagues at [Kabisa](https://www.kabisa.nl/) To help with UX review (Lianne van Thuijl), an awesomme logo (Guido Theelen), discussion about packaging and building (Pascal Widdershoven) and daily motivation (Laurens Boekhorst and Andy Maes).

### Added

- Basic editing to create layer shapes
- Composition of layers with ordering and shift of location
- Placement of mutations on layers and folders
- Support for mutations:
  - Translation
  - Stretch
  - Rotate
  - Deform
  - Opacity
- Create controls to set boundaries to mutations, and change multiple mutations in sync.
- Create animation timeslines, built with keyframes of control values
- Allow emitting custom events by setting an event name on a keyframe
