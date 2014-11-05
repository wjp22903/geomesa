<%@ var config: spray.json.JsValue %>
<%@ var userCn: String %>
<%@ var trackStyles: spray.json.JsValue %>
<!DOCTYPE html>
<html lang="en" ng-app="stealth" ng-controller="AppController">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Replace above line with below line to disable zooming on touch screens. -->
    <!-- <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"> -->

    <title ng-bind="app.title"></title>
    [% styles.forEach(function(file) { %]
    <link rel="stylesheet" href="[%= file %]?[%= datetime %]">[% }); %]
    [% scripts.forEach(function(file) { %]
    <script src="[%= file %]?[%= datetime %]"></script>[% }); %]
    <script type="text/javascript">
        var STEALTH = STEALTH || {};
        STEALTH.config = ${ unescape(config) };
        STEALTH.userCn = '${ userCn }';
        STEALTH.trackStyles = ${ unescape(trackStyles) };

        if (bowser && !(_.any(STEALTH.config.app.browsers, function (minVer, name) {
            return bowser[name] && bowser.version >= minVer;
        }))) {
            window.location = 'browser.html';
        }
    </script>
</head>

<body>
    <div class="anchorTop shadowBottom classBanner {{app.classification.level}}"
         ng-bind="app.classification.text" ng-style="app.classBannerStyle"></div>
    <div class="anchorLeftRight" ng-style="app.betweenClassBannersStyle">
        <sidebar></sidebar>
        <ol3-map id="primaryMap" map="app.primaryMap"
                 class="primaryDisplay anchorTopBottom anchorRight">
        </ol3-map>
    </div>
    <div class="anchorBottom shadowTop classBanner {{app.classification.level}}"
         ng-bind="app.classification.text" ng-style="app.classBannerStyle"></div>
</body>
</html>
