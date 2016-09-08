(function() {
  if (window.chromecastit) {
    return;
  }

  var SESSION_IDLE_TIMEOUT = 300000;

  var currentSession = null;
  var currentMedia = null;

  function onSuccess(message) {
    console.log(message);
  }

  function onError(e) {
    console.log(e);
  }

  window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
    if (loaded) {
      initializeCastApi();
    } else {
      console.log(errorInfo);
    }
  };

  /**
   * initialization
   */
  function initializeCastApi() {
    var apiConfig = new chrome.cast.ApiConfig(
      new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID),
      onSessionConnected.bind(null, function() {
      }),
      function receiverListener(receiverAvailability) {
        if (receiverAvailability === 'available') {
          console.log('receiver found');

          // check if a session ID is saved into localStorage
          var storedSession = JSON.parse(localStorage.getItem('storedSession'));
          if (storedSession) {
            var dateString = storedSession.timestamp;
            var now = new Date().getTime();

            if (now - dateString < SESSION_IDLE_TIMEOUT) {
              if (storedSession) {
                console.log('Found stored session id: ' + storedSession.id);
                chrome.cast.requestSessionById(storedSession.id);
              }
            }
          }
        }
        else {
          console.log('receiver not available');
        }
      },
      chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED);

    chrome.cast.initialize(
      apiConfig,
      function onInitSuccess() {
        console.log('init success');
      },
      onError
    );
  }

  function createSession(cb) {
    console.log('launching app');
    chrome.cast.requestSession(onSessionConnected.bind(null, cb), onError);
  }

  function stopSession() {
    currentSession.stop(function() {
      console.log('Session stopped');
    }, onError);
  }

  function onSessionConnected(cb, session) {
    console.log('Got session: ' + session.sessionId);
    currentSession = session;

    //save session id into localstorage
    if (typeof(Storage) != 'undefined') {
      // Store sessionId and timestamp into an object
      var object = {id: session.sessionId, timestamp: new Date().getTime()};
      localStorage.setItem('storedSession', JSON.stringify(object));
    }

    if (session.media.length != 0) {
      onMediaDiscovered('onRequestSession', session.media[0]);
    }
    session.addMediaListener(onMediaDiscovered.bind(this, 'addMediaListener'));
    session.addUpdateListener(onSessionUpdated.bind(this));
    cb();
  }

  function onSessionUpdated() {
    if (currentSession.status == chrome.cast.SessionStatus.STOPPED) {
      currentSession = null;
    }
  }

  function setVolume(level) {
    if (!currentSession)
      return;

    if (level > 0) {
      currentSession.setReceiverVolumeLevel(
        level,
        onSuccess.bind(this, 'set-volume done'),
        onError);
    } else {
      currentSession.setReceiverMuted(
        true,
        onSuccess.bind(this, 'mute done'),
        onError);
    }
  }


  function loadMedia(mediaTitle, mediaUrl, mediaImageUrl) {
    if (!currentSession) {
      console.log('no session');
      return;
    }

    var mediaInfo = new chrome.cast.media.MediaInfo(mediaUrl);
    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
    mediaInfo.contentType = 'video/mp4';

    mediaInfo.metadata.title = mediaTitle;
    mediaInfo.metadata.images = [{'url': mediaImageUrl}];

    var request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;
    request.currentTime = 0;

    currentSession.loadMedia(request,
      onMediaDiscovered.bind(this, 'loadMedia'),
      onError);
  }

  function onMediaDiscovered(how, media) {
    console.log('new media session ID:' + media.mediaSessionId + ' via (' + how + ')');
    currentMedia = media;
    media.addUpdateListener(onMediaUpdated);
  }

  function getMediaStatus() {
    if (!currentSession || !currentMedia) {
      return;
    }

    currentMedia.getStatus(null,
      onSuccess.bind(this, 'got media status')
      , onError);
  }

  function onMediaUpdated(isAlive) {
    if (!isAlive) {
      currentMedia = null;
    }
  }

  function playMedia() {
    if (!currentMedia) {
      return;
    }
    currentMedia.play(
      null,
      onSuccess.bind(this, 'playing started for media ' + currentMedia.sessionId),
      onError);
  }

  function pauseMedia() {
    if (!currentMedia) {
      return;
    }
    currentMedia.pause(
      null,
      onSuccess.bind('paused media ' + currentMedia.sessionId),
      onError);
  }

  function seekMedia(pos) {
    console.log('Seeking ' + currentMedia.sessionId + ':' +
      currentMedia.mediaSessionId + ' to ' + pos + '%');
    var request = new chrome.cast.media.SeekRequest();
    request.currentTime = pos * currentMedia.media.duration / 100;
    currentMedia.seek(request,
      onSuccess.bind(this, 'media seek done'),
      onError);
  }

  function findUrl(cb) {
    if (location.hostname.indexOf('bilibili.com') != -1) {
      var aid = window.aid;
      var title = document.title;
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var resp = JSON.parse(this.responseText);
          cb(title, resp.src, resp.img);
        }
      };
      xhttp.open('GET', 'http://www.bilibili.com/m/html5?aid=' + aid + '&page=1', true);
      xhttp.send();
    }
  }

  function loadUI() {
    // controls
    var container = document.createElement('div');
    container.style.display = 'block';
    container.style.position = 'fixed';
    container.style.bottom = '0px';
    container.style.left = '0px';
    container.style.height = '50vh';
    container.style.width = '100vw';
    container.style['background-color'] = 'skyblue';
    container.style['z-index'] = '99999';

    var btnPlay = document.createElement('button');
    btnPlay.innerHTML = 'Play';
    btnPlay.addEventListener('click', function playListener() {
      if (!currentSession) {
        createSession(function() {
          findUrl(function(title, url, imgUrl) {
            loadMedia(title, url, imgUrl);
            playMedia();
          });
        });
      } else {
        findUrl(function(title, url, imgUrl) {
          loadMedia(title, url, imgUrl);
          playMedia();
        });
      }
    });

    var btnPause = document.createElement('button');
    btnPause.innerHTML = 'Pause';
    btnPause.addEventListener('click', function playListener() {
      pauseMedia();
    });
    btnPause.style.display = 'none';

    var btnResume = document.createElement('button');
    btnResume.innerHTML = 'Resume';
    btnResume.addEventListener('click', function playListener() {
      playMedia();
    });
    btnResume.style.display = 'none';

    var inputVolume = document.createElement('input');
    inputVolume.type = 'range';
    inputVolume.min = '0';
    inputVolume.max = '100';
    inputVolume.step = '1';

    inputVolume.style.display = 'block';

    inputVolume.addEventListener('mouseup', function() {
      setVolume(this.value / 100);
    });

    var inputProgress = document.createElement('input');
    inputProgress.type = 'range';
    inputProgress.min = '1';
    inputProgress.max = '100';
    inputProgress.step = '1';
    inputProgress.value = '1';

    inputProgress.style.display = 'block';

    inputProgress.addEventListener('mouseup', function() {
      seekMedia(this.value);
    });

    container.appendChild(btnPlay);
    container.appendChild(btnPause);
    container.appendChild(btnResume);
    container.appendChild(inputProgress);
    container.appendChild(inputVolume);

    document.body.appendChild(container);

    setInterval(function uiThread() {
      if (currentSession &&
        currentMedia &&
        currentMedia.playerState == chrome.cast.media.PlayerState.PLAYING) {
        inputProgress.value = currentMedia.getEstimatedTime() / currentMedia.media.duration * 100;
        btnResume.style.display = 'none';
        btnPause.style.display = 'inline-block';
      } else if (currentSession &&
        currentMedia &&
        currentMedia.playerState == chrome.cast.media.PlayerState.PAUSED) {
        btnResume.style.display = 'inline-block';
        btnPause.style.display = 'none';
      }
    }, 100);
  }

  function loadSdk() {
    var chromeCastSdk = document.createElement('script');
    chromeCastSdk.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js';
    document.head.appendChild(chromeCastSdk);
  }

  window.chromecastit = function main(environment) {
    if (environment == 'main') {
      loadUI();
      loadSdk();
    }
  };
})();
