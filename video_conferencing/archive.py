import os

os.chdir('video_conferencing/recorded_videos')
list_files = os.listdir()
list_files.sort(key=lambda x:int(x.split('.')[0]))
command = ''
for x in list_files:
    tmp = x.split('.')[0] + '.mp4'
    os.system('ffmpeg -i ' + x + ' ' + tmp)
    os.system('rm -rf ' + x)
    command += 'file \'' + tmp + '\'\n'
with open('input.txt','w') as f:
    f.write(command)
os.system('ffmpeg -f concat -safe 0 -i input.txt -c copy output.mp4')