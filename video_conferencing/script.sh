for x in $(ls | sort -n);
    do
        echo file \'$x\' >> try.txt
    done
ffmpeg.exe -f concat -safe 0 -i "try.txt" -c copy "video.mp4"