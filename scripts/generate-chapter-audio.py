"""Build offline cast voices and an original, deterministic chapter sound pack.

Run with .local/audio-venv/Scripts/python.exe after installing kokoro-onnx and
soundfile. The downloaded speech model stays in .local/audio-model; only the
finished MP3 assets ship with the game. No runtime speech service is required.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/medieval/audio"
RATE = 24000
CAST = {
    "ALDEN": ("bm_george", .91, "Sir Alden Vale"),
    "MARA": ("bf_emma", 1.01, "Mara Venn"),
    "TOMAS": ("bm_lewis", .96, "Tomas"),
    "HERALD": ("bm_daniel", .96, "The herald"),
    "REMEMBERED VOICE": ("bf_isabella", 1.04, "A voice at the gate"),
}


def encode(name, samples, rate=RATE, folder="sound"):
    directory = OUT / folder
    directory.mkdir(parents=True, exist_ok=True)
    samples = np.asarray(samples, dtype=np.float32)
    peak = np.max(np.abs(samples)) if len(samples) else 0
    if peak > .92:
        samples *= .92 / peak
    path = directory / f"{name}.mp3"
    wav = ROOT / ".local" / f"audio-{name}.wav"
    with wave.open(str(wav), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(rate)
        writer.writeframes((samples * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                    "-codec:a", "libmp3lame", "-b:a", "96k", str(path)], check=True)
    wav.unlink()
    return {"url": f"/assets/medieval/audio/{folder}/{name}.mp3", "duration": round(len(samples) / rate, 3)}


def tone(frequency, seconds, amplitude=.1, kind="bow"):
    t = np.arange(int(seconds * RATE)) / RATE
    phase = 2 * np.pi * frequency * t + .014 * np.sin(2 * np.pi * 4.8 * t)
    if kind == "bell":
        sample = np.sin(phase) + .33 * np.sin(phase * 2.76) + .15 * np.sin(phase * 5.4)
        envelope = np.exp(-t * 2.8) * np.minimum(t * 200, 1)
    elif kind == "flute":
        sample = np.sin(phase) + .16 * np.sin(phase * 2) + .06 * np.sin(phase * 3)
        envelope = np.minimum(t / .14, 1) * np.minimum((seconds - t) / .20, 1)
    else:
        sample = np.sin(phase) + .22 * np.sin(phase * 2) + .11 * np.sin(phase * 3) + .035 * np.sin(phase * 5)
        envelope = np.minimum(t / .6, 1) * np.minimum((seconds - t) / .75, 1)
    return sample * envelope * amplitude


def sounds():
    rng = np.random.default_rng(4815)
    assets = {}

    def noise(seconds):
        return rng.normal(0, 1, int(seconds * RATE))

    def lowpass(x, width=120):
        sums = np.cumsum(np.pad(x, (width, 0)))
        return (sums[width:] - sums[:-width])[:len(x)] / math.sqrt(width)

    for name, seconds in [("footstep", .25), ("swish", .36), ("impact", .48), ("shield", .7), ("coin", .8), ("page", .6), ("gate", 2.4), ("horn", 3.8), ("ui", .22)]:
        t = np.arange(int(seconds * RATE)) / RATE
        n = noise(seconds)
        if name == "shield":
            x = n * .10 * np.exp(-t * 32)
            for f, volume in [(268, .24), (541, .14), (882, .08), (1473, .05)]:
                x += np.sin(t * 2 * np.pi * f) * volume * np.exp(-t * (4 + f / 500))
        elif name == "swish":
            x = (n - lowpass(n, 14)) * .17 * np.sin(np.pi * t / seconds) ** 2
        elif name == "footstep":
            x = lowpass(n, 65) * .17 * np.exp(-t * 18) + n * .055 * np.exp(-t * 24)
        elif name == "impact":
            x = lowpass(n, 150) * .25 * np.exp(-t * 11) + np.sin(t * 2 * np.pi * 94) * .22 * np.exp(-t * 15)
        elif name == "gate":
            x = lowpass(n, 70) * .08 * np.sin(np.pi * t / seconds)
            x += np.sin(t * 2 * np.pi * (57 + 6 * np.sin(t * 2))) * .10 * np.sin(np.pi * t / seconds)
            at = int(1.9 * RATE)
            x[at:] += lowpass(n[:len(x) - at], 100) * .5 * np.exp(-np.arange(len(x) - at) / RATE * 13)
        elif name == "horn":
            x = tone(146.83, seconds, .19) + tone(220, seconds, .075)
        elif name == "page":
            x = (n - lowpass(n, 30)) * .07 * np.sin(np.pi * t / seconds) ** 3
        else:
            x = tone(1046.5 if name == "coin" else 587.3, seconds, .12, "bell")
        assets[name] = encode(name, x)

    # Original D-minor / Dorian phrases, composed for this prototype.
    for name, beat, bars, combat in [("courtyard", .75, 16, False), ("trial", .5, 16, True), ("revelation", 1.0, 12, False)]:
        seconds = beat * bars * 4
        x = np.zeros(int(seconds * RATE))
        chords = [(146.83, 174.61, 220), (130.81, 164.81, 196), (116.54, 146.83, 174.61), (130.81, 164.81, 220)]
        for bar in range(bars):
            at = int(bar * beat * 4 * RATE)
            for frequency in chords[(bar // 2) % 4]:
                note = tone(frequency / 2, beat * 4, .045 if combat else .038)
                x[at:at + len(note)] += note
            melody = [293.66, 349.23, 440, 392, 349.23, 329.63, 293.66, 261.63]
            for b in range(4):
                start = at + int(b * beat * RATE)
                note = tone(melody[(bar * 3 + b) % len(melody)], beat * .87, .035 if combat else .06, "bell" if combat else "flute")
                x[start:start + len(note)] += note
                if combat or b == 0:
                    drum_t = np.arange(int(beat * .55 * RATE)) / RATE
                    drum = np.sin(2 * np.pi * (70 * drum_t - 23 * drum_t ** 2)) * np.exp(-drum_t * 18) * (.16 if combat else .065)
                    x[start:start + len(drum)] += drum
        fade = np.minimum(np.arange(len(x)) / (RATE * .3), 1) * np.minimum(np.arange(len(x))[::-1] / (RATE * .3), 1)
        assets[name] = encode(name, x * fade, folder="music")

    for name in ["wind", "rain", "forge"]:
        seconds = 24
        t = np.arange(seconds * RATE) / RATE
        n = noise(seconds)
        x = lowpass(n, 240) * .065 * (1 + .3 * np.sin(t * .55))
        if name == "rain":
            x += n * .045
        elif name == "forge":
            x += n * .025 * (np.sin(t * 13) ** 16)
            for at_s in [2, 5.4, 8.7, 13, 16.1, 20.2]:
                at = int(at_s * RATE)
                note = tone(312, .55, .065, "bell")
                x[at:at + len(note)] += note
        else:
            for at_s in [2, 3, 10, 15, 19]:
                at = int(at_s * RATE)
                note = tone(1450 + at_s * 13, .24, .025, "flute")
                x[at:at + len(note)] += note
        fade = np.minimum(t / .25, 1) * np.minimum((seconds - t) / .25, 1)
        assets[name] = encode(name, x * fade, folder="ambience")
    return assets


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sound-only", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text("utf-8")) if path.exists() else {"version": 1, "voices": {}, "sounds": {}}
    manifest["sounds"] = sounds()
    manifest["provenance"] = {"speech": "Kokoro-82M v1.0, synthetic stock voices, Apache-2.0", "scoreAndEffects": "Original deterministic synthesis; scripts/generate-chapter-audio.py", "model": "https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0"}
    path.write_text(json.dumps(manifest, indent=2), "utf-8")
    if args.sound_only:
        print(f"Sound pack: {len(manifest['sounds'])} assets", flush=True)
        return
    from kokoro_onnx import Kokoro
    import onnxruntime as ort
    session_options = ort.SessionOptions()
    session_options.intra_op_num_threads = 4
    session_options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(ROOT / ".local/audio-model/kokoro-v1.0.int8.onnx"), sess_options=session_options, providers=["CPUExecutionProvider"])
    kokoro = Kokoro.from_session(session, str(ROOT / ".local/audio-model/voices-v1.0.bin"))
    available = kokoro.get_voices()
    print("Available voices: " + ", ".join(available), flush=True)
    catalogue = json.loads((ROOT / "content/story/chapter-01-dialogue.json").read_text("utf-8"))
    entries = catalogue["dialogue"] + catalogue.get("exerciseCues", [])
    if args.limit:
        entries = entries[:args.limit]
    for index, entry in enumerate(entries):
        voice, speed, name = CAST.get(entry.get("speaker", "ALDEN"), CAST["ALDEN"])
        if voice not in available:
            voice = "bm_george" if voice.startswith("bm_") else "bf_emma"
        text = entry["text"].replace("Ilyra", "Ill-eer-ah").replace("Veyr", "Vair")
        digest = hashlib.sha256((text + voice + str(speed)).encode()).hexdigest()
        old = manifest["voices"].get(entry["id"])
        if old and old.get("hash") == digest and (ROOT / "public" / old["url"].lstrip("/")).exists():
            continue
        samples, rate = kokoro.create(text, voice=voice, speed=speed, lang="en-gb")
        samples = np.pad(samples, (int(.05 * rate), int(.16 * rate)))
        info = encode(entry["id"], samples, rate, "voice")
        manifest["voices"][entry["id"]] = {**info, "speaker": entry.get("speaker", "ALDEN"), "voice": voice, "name": name, "hash": digest}
        path.write_text(json.dumps(manifest, indent=2), "utf-8")
        print(f"{index + 1}/{len(entries)} {entry['id']} {voice} {info['duration']}s", flush=True)
    print(f"Finished: {len(manifest['voices'])} lines, {len(manifest['sounds'])} sound assets", flush=True)


if __name__ == "__main__":
    main()
