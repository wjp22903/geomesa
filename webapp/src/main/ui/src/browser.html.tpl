<%@ var config: spray.json.JsValue %>
<html lang="en">
    <head>
        <style type="text/css">
            body {
                background: rgb(35,83,138); /* Old browsers */
                background: -moz-linear-gradient(top,  rgba(35,83,138,1) 0%, rgba(167,207,223,1) 100%); /* FF3.6+ */
                background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(35,83,138,1)), color-stop(100%,rgba(167,207,223,1))); /* Chrome,Safari4+ */
                background: -webkit-linear-gradient(top,  rgba(35,83,138,1) 0%,rgba(167,207,223,1) 100%); /* Chrome10+,Safari5.1+ */
                background: -o-linear-gradient(top,  rgba(35,83,138,1) 0%,rgba(167,207,223,1) 100%); /* Opera 11.10+ */
                background: -ms-linear-gradient(top,  rgba(35,83,138,1) 0%,rgba(167,207,223,1) 100%); /* IE10+ */
                background: linear-gradient(to bottom,  rgba(35,83,138,1) 0%,rgba(167,207,223,1) 100%); /* W3C */
                filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#23538a', endColorstr='#a7cfdf',GradientType=0 ); /* IE6-9 */
            }
            #message {
                background-color: #EEEEEE;
                border: 1px solid #888888;
                padding: 10px;
                border-radius: 5px;
                width: 400px;
                height: 200px;
                margin: auto;
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                box-shadow: 0px 8px 12px 0px rgba(0, 0, 0, 0.3)
            }
            #header {
                margin-bottom: 20px;
                padding: 15px;
                color: #A94442;
                background-color: #F2DEDE;
                border-color: #EBCCD1;
                border: 1px solid transparent;
                border-radius: 4px;
                text-align: center;
                font-size: 20px;
            }
        </style>
        <script type="text/javascript">
            var STEALTH = STEALTH || {};
            STEALTH.config = ${ unescape(config) };

            function listBrowsers() {
                var list = '';
                for (var key in STEALTH.config.app.browsers) {
                    var browser = STEALTH.config.app.browsers[key];
                    if (browser.maxVersion) {
                        list += '<li>' + browser.name + ' between versions ' + browser.minVersion + ' and ' + browser.maxVersion + '</li>';
                    } else {
                        list += '<li>' + browser.name + ' ' + browser.minVersion + ' or higher</li>';
                    }
                }
                document.getElementById('browsers').innerHTML = list;
            }
        </script>
    </head>
    <body onload="listBrowsers()">
        <div id="message">
            <div id="header"><b>!</b> Access Blocked <b>!</b></div>
            This site requires one of the following browsers:
            <ul id="browsers"></ul>
        </div>
    </body>
</html>
