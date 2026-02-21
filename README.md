# SleepTracker

## Sleep Aid Audio Asset Notes

Sleep Aid now supports these calming categories in `app/sleep-aid/audio.tsx`:
- Brown noise
- Pink noise
- Soft rain
- Ocean waves
- Forest night ambience
- Soft fan hum

Current repository audio files are used as placeholders for some categories so the feature works offline immediately.

### TODO: Replace placeholder sounds with production-grade loops

Recommended free sources for high-quality, loop-friendly ambience:
- [Freesound](https://freesound.org/) (filter by Creative Commons license and seamless loops)
- [Pixabay Sound Effects](https://pixabay.com/sound-effects/)
- [Mixkit Audio](https://mixkit.co/free-sound-effects/)

Suggested target file structure:
- `assets/audio/brown-noise.wav`
- `assets/audio/pink-noise.wav`
- `assets/audio/soft-rain.wav`
- `assets/audio/ocean-waves.wav`
- `assets/audio/forest-night.wav`
- `assets/audio/soft-fan-hum.wav`

After adding those files, update `SOUND_OPTIONS` in `/app/sleep-aid/audio.tsx` to point each category to its dedicated asset and remove `placeholder: true` flags.
