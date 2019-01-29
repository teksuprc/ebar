var ecobar_client = (function($, io, toastr) {
    'use strict';

    var nickname = 'bob';
    var appId = 'test1';
    var allowJoin = false;
    var socket = null;
    var joined = false;
    var clientName = 'client-'+new Date().getTime();
    toastr.options = {
        positionClass: "toast-top-full-width",
        closeButton: true,
        newestOnTop: true,
        progressBar: false,
        preventDuplicates: true,
        onclick: null,
        showDuration: "0",
        hideDuration: "0",
        timeOut: 0,
        extendedTimeOut: 0,
        showEasing: "swing",
        hideEasing: "linear",
        showMethod: "fadeIn",
        hideMethod: "fadeOut",
        tapToDismiss: false,
        maxOpened: 1
    };

    document.getElementById('btnConnect').disabled = false;
    document.getElementById('btnDisconnect').disabled = true;

    var join = function() {
        nickname = document.getElementById('nickname').value;
        var select = document.getElementById('appId');
        appId = select.options[select.selectedIndex].value;

        if(nickname && (nickname.length > 3) && appId) {
            connect();
        }
    };

    var disconnect = function() {
        if(socket && joined) {
            socket.disconnect();
            document.getElementById('btnConnect').disabled = false;
            document.getElementById('btnDisconnect').disabled = true;
        }
    };

    var connect = function() {
        try {

            socket = io('http://localhost:8080', {
                forceNew: false,
                secure: true,
                reconnect: true,
                reconnectionAttempts: 'Infinity',
                reconnectionDelay: 5000,
                reconnectionDelayMax: 10000,
                randomizationFactor: 0.5,
                autoConnect: true,
                /*
                path: `/${appId}`,
                upgrade: true,
                */
                // NOTE: these are nodejs client side ONLY
                //key: 'private key for ssl',
                //cert: 'x509 certificate,
                //ca: 'certificate authority',
                //cipher: 'the cipher to use [tls1_3, tls1_2, tls1_1, tls1, ssl3, aes256, sha256] TLS_RSA_WITH_AES_256_CBC_SHA            AES256-SHA'
                //transport: ['websocket', 'polling']
                transport: ['polling']
            });

            socket.on('connect', function() {
                console.log('client connect', nickname, appId, socket.id);
                socket.emit('join', { "name": nickname, "appIds": appId });
                document.getElementById('btnConnect').disabled = true;
                document.getElementById('btnDisconnect').disabled = false;  
                joined = true;
            });

            socket.on(`${appId}-message`, function(msg) {
                var text = msg.message;
                let date = new Date(parseInt(msg.datetime));
                if(text) {
                    switch(msg.type) {
                        case 'db-message':
                            toastr.info(text, `[${appId}-message ${date.toISOString()}]`);
                            break;
                        case `${appId}-message`:
                            toastr.success(text, `[${appId}-Admin ${date.toISOString()}]`);
                            break;
                        default:
                            toastr.info(text, `[${appId}-message ${date.toISOString()}]`);
                    }
                }
                
                var el = document.getElementById('messages');
                el.innerHTML += `<li style="width: 100%;">[${msg.appId} - ${date.toISOString()}]:<br/><textarea style="width:auto;height:auto;min-width:100%;min-height:85px;" maxlength="1024" readonly="readonly">${msg.message}</textarea></li>`;
                el.scrollTop = el.scrollHeight;
            });

            socket.on('disconnect', function() {
                console.log('client disconnected');
            });
        }
        catch(err) {
            console.log(err.message);
        }
    };

    return {
        join: join,
        disconnect: disconnect
    };

})(window.jQuery, window.io, window.toastr);

