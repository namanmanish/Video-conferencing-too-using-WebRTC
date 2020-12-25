var localStream = null;
var hasstarted = false
var alreadyrecieved = []
var videoalreadyadded = []
var conntetedpeers = {}
var gc = 0
var endpoint = 'ws://' + window.location.host + '/ws/' + room_id + '/' + user_name + '/'
var mediaConstraints = {
    audio: true, 
    video: true 
};
getLocalStreamFunc()
socket = new WebSocket(endpoint)
socket.onmessage = function(e) {
    var data = JSON.parse(e.data).obj
    // console.log(data)
    if(data.type === "joined")
        invite(data)
    else if(data.type === "video-offer" && data.target=== user_name)
        handleVideoOfferMsg(data)
    else if(data.type === "new-ice-candidate" && data.target === user_name)
        handleNewICECandidateMsg(data)
    else  if(data.type === "video-answer" && data.target === user_name)
        handleAnswerMsg(data)
    else if(data.type === "left")
        handleLeftMsg(data)
}
async function getLocalStreamFunc()
{
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    onMediaSuccess(localStream)
    addVideoStream(localStream,user_name)
}
async function invite(data)
{
    targetUsername = data.name;
    createPeerConnection(targetUsername);
    myPeerConnection = conntetedpeers[targetUsername][0]
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
}
function createPeerConnection(targetUsername)
{
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
            urls: "stun:stun.l.google.com:19302"
            }
        ]
    });
    myPeerConnection.onicecandidate = tmpIcefunc = e => handleICECandidateEvent(e,targetUsername);
    myPeerConnection.onnegotiationneeded = tmpfunc = e => handleNegotiationNeededEvent(e,targetUsername);
    myPeerConnection.ontrack = tmpStreamfunc = e => handleRemoteStreamEvent(e,targetUsername);
    conntetedpeers[targetUsername] = [myPeerConnection,[]]
    myPeerConnection = null
}
async function handleNegotiationNeededEvent(event,targetUsername) 
{
    if(alreadyrecieved.includes(targetUsername))
        return
    myPeerConnection = conntetedpeers[targetUsername][0]
    await myPeerConnection.createOffer()
    await myPeerConnection.setLocalDescription();
    socket.send(JSON.stringify({
        "name": user_name,
        "target": targetUsername,
        "type": "video-offer",
        "sdp": myPeerConnection.localDescription
    }))
}
async function handleAnswerMsg(msg)
{
    var desc = new RTCSessionDescription(msg.sdp)
    // console.log(msg)
    myPeerConnection = conntetedpeers[msg.name][0]
    if(!!!desc)
        return
    await myPeerConnection.setRemoteDescription(desc)
    candidates = conntetedpeers[msg.name][1]
    candidates.forEach(candidate => myPeerConnection.addIceCandidate(candidate))
} 
async function handleVideoOfferMsg(msg) 
{
    targetUsername = msg.name;
    alreadyrecieved = [...alreadyrecieved,msg.name]
    var desc = new RTCSessionDescription(msg.sdp);
    createPeerConnection(targetUsername);
    myPeerConnection = conntetedpeers[msg.name][0]
    await myPeerConnection.setRemoteDescription(desc)
    candidates = conntetedpeers[msg.name][1]
    candidates.forEach(candidate => myPeerConnection.addIceCandidate(candidate))
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    localStream = stream;
    await localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    myPeerConnection = conntetedpeers[msg.name][0]
    answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription();
    socket.send(JSON.stringify({
        "name": user_name,
        "target": targetUsername,
        "type": "video-answer",
        "sdp": myPeerConnection.localDescription
    }))
}
function handleICECandidateEvent(event,targetUsername) 
{
    if (event.candidate) 
    {
        socket.send(JSON.stringify({
            "type": "new-ice-candidate",
            "target": targetUsername,
            "name": user_name,
            "candidate": event.candidate
        }))
    }
}
function handleNewICECandidateMsg(msg) 
{
    var candidate = new RTCIceCandidate(msg.candidate);
    candidates = conntetedpeers[msg.name][1]
    myPeerConnection = conntetedpeers[msg.name][0]
    if(!myPeerConnection || !myPeerConnection.remoteDescription)
        candidates.push(candidate)
    else
        myPeerConnection.addIceCandidate(candidate)
}
function handleRemoteStreamEvent(event,user_id)
{
    console.log(event)
    addVideoStream(event.streams[0],user_id)
}
function handleLeftMsg(msg)
{
    document.getElementById(msg.name).remove()
}
function addVideoStream(stream,user_id) 
{
    // console.log(user_id,videoalreadyadded,user_id in videoalreadyadded)
    if(videoalreadyadded.includes(user_id))
    {
        const video = document.getElementById(user_id)
        video.srcObject = stream
        video.addEventListener('loadedmetadata', () => {
            video.play()
        })
        return
    }
    const video = document.createElement('video')
    video.id = user_id
    if(user_id === user_name)
        video.muted = true;
    const videoGrid = document.getElementById('video-grid')
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
    videoalreadyadded = [...videoalreadyadded,user_id]
}
function onMediaSuccess(stream)
{
    var mediaRecorder = new MediaStreamRecorder(stream,{mimeType: 'video/webm;codecs=vp8'})
    mediaRecorder.ondataavailable = dataAvailable
    mediaRecorder.start(1500)
}
function dataAvailable(blob)
{
    console.log("tere")
    var file = new File([blob], gc + '.webm',{type: 'video/webm'})
    gc = gc + 1
    var formData = new FormData()
    formData.append('filename', file.name)
    formData.append('drive_file', file)
    var xhr = new XMLHttpRequest()
    let url = 'http://' + window.location.host + '/recorder/' + user_name + '/'
    xhr.open('post', url)
    const csrftoken = getCookie('csrftoken')
    xhr.setRequestHeader('X-CSRFToken', csrftoken)
    xhr.send(formData)
}
function muteUnmute()
{
    var enabled = localStream.getAudioTracks()[0].enabled;
    if (enabled)
    {
        localStream.getAudioTracks()[0].enabled = false;
        // document.getElementById(user_name).srcObject.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    }
    else
    {
        setMuteButton();
        localStream.getAudioTracks()[0].enabled = true;
        // document.getElementById(user_name).srcObject.getAudioTracks()[0].enabled = true;
    }
}
function playStop()
{
    var enabled = localStream.getVideoTracks()[0].enabled;
    if (enabled)
    {
        localStream.getVideoTracks()[0].enabled = false;
        document.getElementById(user_name).srcObject.getVideoTracks()[0].enabled = false;
        setPlayVideo()
    }
    else
    {
        setStopVideo()
        localStream.getVideoTracks()[0].enabled = true;
        document.getElementById(user_name).srcObject.getVideoTracks()[0].enabled = true;
    }
}
function setMuteButton()
{
    const html = `<button onclick="muteUnmute()"><i class="fas fa-microphone"></i></button>`
    document.querySelector('.main__mute_button').innerHTML = html;
}
function setUnmuteButton()
{
    const html = `<button class="btn-sec" onclick="muteUnmute()"><i class="fas fa-microphone-slash"></i></button>`
    document.querySelector('.main__mute_button').innerHTML = html;
}
function setStopVideo()
{
    const html = `<button onclick="playStop()"><i class="fas fa-video"></i></button>`
    document.querySelector('.main__video_button').innerHTML = html;
}
function setPlayVideo()
{
    const html = `<button class="btn-sec" onclick="playStop()"><i class="fas fa-video-slash"></i></button>`
    document.querySelector('.main__video_button').innerHTML = html;
}
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}