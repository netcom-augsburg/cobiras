#!/bin/bash

PREP_DIR=$(pwd)
DASH_SETUP="$(pwd)/../DASH-setup"
SERVER_PUBLIC="$DASH_SETUP/server/data/public"

encode () { #1:resolution 2:crf 3:maxbitrate 4:preset
	NAME="ToS_${1}_${2}_${3}k.mp4"
	docker run --rm -it \
	  -v $(pwd):/data \
	  linuxserver/ffmpeg:version-4.4-cli \
	  -i /data/tearsofsteel_4k.mov \
	  -an \
	  -c:v libx264 \
	  -pix_fmt yuv420p \
	  -tune film \
	  -x264opts no-scenecut \
	  -r 24 \
	  -g 96 \
	  -bf 3 \
	  -preset ${4} \
	  -crf ${2} \
	  -maxrate ${3}k \
	  -bufsize $((${3}*2))k \
	  -vf scale=${1}:-2 \
	  -t 00:12:12 \
	  -f mp4 /data/encodes/$NAME
}

encode_m4s_to_mp4 () {
  cd $PREP_DIR/dash
  for file in *_20000k_dash*.m4s; do
    cat ToS_3840_21_20000k_dash.mp4 > segment_sources/${file%.*}.mp4
    cat $file >> segment_sources/${file%.*}.mp4
  done

  #remove file prefix
  for file in "segment_sources/ToS_3840_21_20000k_"* ; do
      mv "$file" "${file/ToS_3840_21_20000k_/}"
  done
}

dash () {
  docker run --rm -it \
  -v $(pwd):/gpac \
  jjlin/gpac:2.2.0 \
  MP4Box \
  -dash 4000 \
  -rap \
  -frag-rap \
  -bs-switching inband \
  -profile dashavc264:live \
  ${1} -out "./dash/playlist.mpd"
}

# download tears of steel 4k source
# you can also choose another mirror: https://mango.blender.org/download/
wget https://ftp.halifax.rwth-aachen.de/blender/demo/movies/ToS/tearsofsteel_4k.mov

# encode dash representations
encode 0640 23 570 slow
encode 0854 22 1050 slow
encode 1280 21 2150 slow
encode 1920 21 4600 slow
encode 2560 21 9000 slow
encode 3840 21 20000 slow
encode 0640 28 314 slow
encode 0640 28 336 slow
encode 0640 26 402 slow
encode 0640 26 429 slow
encode 0640 24 515 slow
encode 0640 22 663 slow
encode 0640 22 708 slow
encode 0854 25 759 slow
encode 0854 25 811 slow
encode 0854 24 863 slow
encode 0854 24 922 slow
encode 0854 23 983 slow
encode 0854 22 1121 slow
encode 0854 22 1197 slow
encode 0854 21 1281 slow
encode 0854 21 1368 slow
encode 0854 20 1468 slow
encode 0854 20 1568 slow
encode 1280 24 1645 slow
encode 1280 23 1757 slow
encode 1280 23 1879 slow
encode 1280 22 2006 slow
encode 1280 21 2301 slow
encode 1280 21 2481 slow
encode 1280 20 2650 slow
encode 1280 20 2869 slow
encode 1280 19 3064 slow
encode 1920 24 3350 fast
encode 1920 23 3577 fast
encode 1920 23 3861 fast
encode 1920 22 4124 fast
encode 1920 21 5009 fast
encode 1920 21 5488 fast
encode 1920 20 5861 fast
encode 1920 20 6466 fast
encode 1920 19 6906 fast
encode 2560 20 7768 veryfast
encode 2560 20 8296 veryfast
encode 2560 19 10069 veryfast
encode 2560 18 11536 veryfast
encode 2560 18 12320 veryfast
encode 2560 17 14214 veryfast
encode 2560 17 15180 veryfast

#dash representations
dash "encodes/ToS_3840_21_20000k.mp4 encodes/ToS_2560_17_15180k.mp4 encodes/ToS_2560_17_14214k.mp4 encodes/ToS_2560_18_12320k.mp4 encodes/ToS_2560_18_11536k.mp4 encodes/ToS_2560_19_10069k.mp4 encodes/ToS_2560_21_9000k.mp4 encodes/ToS_2560_20_8296k.mp4 encodes/ToS_2560_20_7768k.mp4 encodes/ToS_1920_19_6906k.mp4 encodes/ToS_1920_20_6466k.mp4 encodes/ToS_1920_20_5861k.mp4 encodes/ToS_1920_21_5488k.mp4 encodes/ToS_1920_21_5009k.mp4 encodes/ToS_1920_21_4600k.mp4 encodes/ToS_1920_22_4124k.mp4 encodes/ToS_1920_23_3861k.mp4 encodes/ToS_1920_23_3577k.mp4 encodes/ToS_1920_24_3350k.mp4 encodes/ToS_1280_19_3064k.mp4 encodes/ToS_1280_20_2869k.mp4 encodes/ToS_1280_20_2650k.mp4 encodes/ToS_1280_21_2481k.mp4 encodes/ToS_1280_21_2301k.mp4 encodes/ToS_1280_21_2150k.mp4 encodes/ToS_1280_22_2006k.mp4 encodes/ToS_1280_23_1879k.mp4 encodes/ToS_1280_23_1757k.mp4 encodes/ToS_1280_24_1645k.mp4 encodes/ToS_0854_20_1568k.mp4 encodes/ToS_0854_20_1468k.mp4 encodes/ToS_0854_21_1368k.mp4 encodes/ToS_0854_21_1281k.mp4 encodes/ToS_0854_22_1197k.mp4 encodes/ToS_0854_22_1121k.mp4 encodes/ToS_0854_22_1050k.mp4 encodes/ToS_0854_23_983k.mp4 encodes/ToS_0854_24_922k.mp4 encodes/ToS_0854_24_863k.mp4 encodes/ToS_0854_25_811k.mp4 encodes/ToS_0854_25_759k.mp4 encodes/ToS_0640_22_708k.mp4 encodes/ToS_0640_22_663k.mp4 encodes/ToS_0640_23_570k.mp4 encodes/ToS_0640_24_515k.mp4 encodes/ToS_0640_26_429k.mp4 encodes/ToS_0640_26_402k.mp4 encodes/ToS_0640_28_336k.mp4 encodes/ToS_0640_28_314k.mp4"

#create source files of segments for at runtime encoding
encode_m4s_to_mp4

#move files to DASH-setup
cd $PREP_DIR/dash
mv ./segment_sources/*.mp4 $SERVER_PUBLIC/encode_temp/ToS
mv ./*.m4s $SERVER_PUBLIC/videos/ToS_runtime
cp ./ToS_3840_21_20000k_dash.mp4 $SERVER_PUBLIC/videos/ToS_default/ToS_default.mp4
cp ./ToS_3840_21_20000k_dash.mp4 $SERVER_PUBLIC/videos/ToS_pre/ToS_pre.mp4
cp ./ToS_3840_21_20000k_dash.mp4 $SERVER_PUBLIC/videos/ToS_runtime/ToS_runtime.mp4

#create some symbolic links to save disk space
cd $SERVER_PUBLIC/videos/ToS_pre
ln -s ../ToS_runtime/ToS_3840_21_20000k_*.m4s .
ln -s ../ToS_runtime/ToS_*dash1.m4s .
cd ../ToS_default
ln -s ../ToS_runtime/ToS_3840_21_20000k_*.m4s .
ln -s ../ToS_runtime/ToS_2560_21_9000k_*.m4s .
ln -s ../ToS_runtime/ToS_1920_21_4600k_*.m4s .
ln -s ../ToS_runtime/ToS_1280_21_2150k_*.m4s .
ln -s ../ToS_runtime/ToS_0854_22_1050k_*.m4s .
ln -s ../ToS_runtime/ToS_0640_23_570k_*.m4s .
