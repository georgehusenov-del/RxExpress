#!/bin/bash
set -e

FRAMES=/app/video_build/frames
AUDIO=/app/video_build/audio
CLIPS=/app/video_build/clips
OUT=/app/rxexpresss-pharmacy-walkthrough.mp4
PAD=0.3

mkdir -p "$CLIPS"
rm -f "$CLIPS"/*.mp4 "$OUT"

SCENES=(
  "01:01_landing.png:01_01_landing.mp3"
  "02:02_login.png:02_02_login.mp3"
  "03:03_dashboard.png:03_03_dashboard.mp3"
  "04:04_dashboard_delivered.png:04_04_dashboard_delivered.mp3"
  "05:05_order_detail.png:05_05_order_detail.mp3"
  "06:06_pod.png:06_06_pod.mp3"
  "07:07_create_order_modal.png:07_07_create_order_modal.mp3"
  "08:08_create_order_types.png:08_08_create_order_types.mp3"
  "09:09_create_order_cold.png:09_09_create_order_cold.mp3"
  "10:10_reports_top.png:10_10_reports_top.mp3"
  "11:11_reports_monthly.png:11_11_reports_monthly.mp3"
  "12:12_reports_bydriver.png:12_12_reports_bydriver.mp3"
  "13:13_developers_top.png:13_13_developers_top.mp3"
  "14:14_developers_endpoints.png:14_14_developers_endpoints.mp3"
  "15:15_developers_webhooks.png:15_15_developers_webhooks.mp3"
  "16:16_closing.png:16_16_closing.mp3"
)

for s in "${SCENES[@]}"; do
  IFS=':' read -r idx img aud <<< "$s"
  img_path="$FRAMES/$img"
  aud_path="$AUDIO/$aud"
  dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$aud_path")
  clip_dur=$(python3 -c "print(${dur}+${PAD})")
  out_clip="$CLIPS/scene_${idx}.mp4"
  echo "==> Building scene $idx (audio=${dur}s, clip=${clip_dur}s)"

  padded_aud="$CLIPS/aud_${idx}.m4a"
  ffmpeg -y -loglevel error -i "$aud_path" \
    -af "apad=pad_dur=${PAD},atrim=duration=${clip_dur},aresample=44100" \
    -c:a aac -b:a 192k "$padded_aud"

  ffmpeg -y -loglevel error \
    -loop 1 -framerate 30 -t "$clip_dur" -i "$img_path" \
    -i "$padded_aud" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,format=yuv420p" \
    -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
    -c:a aac -b:a 192k \
    -shortest -movflags +faststart \
    "$out_clip"
done

CONCAT=/app/video_build/concat.txt
> "$CONCAT"
for f in "$CLIPS"/scene_*.mp4; do
  echo "file '$f'" >> "$CONCAT"
done

echo "==> Concatenating into $OUT"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$CONCAT" -c copy "$OUT"

echo "==> Result:"
ls -lh "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_type,codec_name -of default=noprint_wrappers=1 "$OUT"
