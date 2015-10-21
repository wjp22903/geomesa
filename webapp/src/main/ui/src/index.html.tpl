<%@ var config: spray.json.JsValue %>
<%@ var userCn: String %>
<%@ var datetime: String %>
<%@ var jmxCss: List[String] %>
<%@ var jmxJs: List[String] %>
<%@ var plugins: List[String] %>

<!DOCTYPE html>
<html lang="en" ng-app="stealth.app" ng-controller="AppController" ng-strict-di>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Replace above line with below line to disable zooming on touch screens. -->
    <!-- <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"> -->

    <title ng-bind="::app.title"></title>
</head>

<body>
    <div class="shadowBottom classBanner {{::app.classification.level}}"
         ng-bind="::app.classification.text">
    </div>
    <div class="appContents">
        <ccri-bars-hbar bar-id="top" class="shadowBottom"></ccri-bars-hbar>
        <div class="viewPort">
            <st-sidebar></st-sidebar>
            <div class="primaryDisplay anchorTopBottom anchorRight">
                <st-ol3-map id="primaryMap"></st-ol3-map>
                <st-popup-container></st-popup-container>
                <st-header></st-header>
                <st-wizard></st-wizard>
            </div>
        </div>
        <ccri-bars-hbar bar-id="bottom" class="shadowTop"></ccri-bars-hbar>
        <div id="splash" class="splashPage"
             ng-if="::CONFIG.app.showSplash">
            <iframe ng-src="{{CONFIG.app.splashUrl}}"></iframe>
            <div class="fa fa-fw fa-close fa-5x splashDismissButton"
                 ng-style="splashDismissButton"
                 ng-click="dismissSplash()">
            </div>
        </div>
    </div>
    <div class="shadowTop classBanner {{::app.classification.level}}"
         ng-bind="::app.classification.text">
    </div>

    [% styles.forEach(function(file) { %]
    <link rel="stylesheet" href="[%= file %]?[%= datetime %]">[% }); %]
    [% scripts.forEach(function(file) { %]
    <script src="[%= file %]?[%= datetime %]"></script>[% }); %]
    <script type="text/javascript">
        var STEALTH = STEALTH || {};
        STEALTH.config = ${ unescape(config) };
        STEALTH.userCn = '${ userCn }';

        if (bowser && !(_.any(STEALTH.config.app.browsers, function (browserInfo, name) {
            var underMaxVersion = browserInfo.maxVersion ? browserInfo.maxVersion >= bowser.version : true;
            return bowser[name] && bowser.version >= browserInfo.minVersion && underMaxVersion;
        }))) {
            window.location = 'browser.html';
        }
    </script>

    <!-- CSS from JMX Plugins -->
    #for (css <- jmxCss)
        <link rel="stylesheet" href="${css}?${datetime}">
    #end

    <!-- JS from JMX Plugins -->
    #for (js <- jmxJs)
        <script src="${js}?${datetime}"></script>
    #end

    <!-- Load Plugins -->
    #if (plugins.nonEmpty)
        <script>
            angular.module('stealth.plugins', [
                '<%= plugins.mkString("','") %>'
            ]);
        </script>
    #end
</body>
</html>
