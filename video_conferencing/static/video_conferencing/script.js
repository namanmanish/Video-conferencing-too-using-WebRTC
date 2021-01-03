var localStream = null;
var videoalreadyadded = []
var conntetedpeers = new Object()
var displayMediaStream = null
var endpoint = 'ws://' + window.location.host + '/ws/' + room_id + '/' + user_name + '/'
var mediaConstraints = {
    audio: false, 
    video: true 
};
getLocalStreamFunc()
socket = new WebSocket(endpoint)
socket.onmessage = function(e) {
    var data = JSON.parse(e.data).obj
    if(data.type === "joined")
        invite(data)
    else if(data.type === "video-offer" && (data.target=== user_name || data.target=== user_name+'$'))
        handleVideoOfferMsg(data)
    else if(data.type === "new-ice-candidate" && (data.target === user_name || data.target=== user_name+'$'))
        handleNewICECandidateMsg(data)
    else  if(data.type === "video-answer" && (data.target === user_name || data.target=== user_name+'$'))
        handleAnswerMsg(data)
    else if(data.type === "left")
        handleLeftMsg(data)
}
async function getLocalStreamFunc()
{
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
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
    addVideoStream(event.streams[0],user_id)
}
function handleLeftMsg(msg)
{
    document.getElementById(msg.name).remove()
    videoalreadyadded = videoalreadyadded.filter(i => i !== msg.name)
    delete conntetedpeers[msg.name]
}
async function inviteShare(targetUsername)
{
    createPeerConnection(targetUsername);
    myPeerConnection = conntetedpeers[targetUsername][0]
    if(displayMediaStream)
        myPeerConnection.addTrack(displayMediaStream.getTracks()[0],displayMediaStream);
}
async function shareScreen()
{
    user_name=user_name+"$"
    screenshare=true
    if(!displayMediaStream){
        displayMediaStream=await navigator.mediaDevices.getDisplayMedia();
    }
    addVideoStream(displayMediaStream,user_name)
    for (var key in conntetedpeers){
        inviteShare(key);
    }
}
function addVideoStream(stream,user_id) 
{
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
function muteUnmute()
{
    var enabled = localStream.getAudioTracks()[0].enabled;
    if (enabled)
    {
        localStream.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    }
    else
    {
        setMuteButton();
        localStream.getAudioTracks()[0].enabled = true;
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
