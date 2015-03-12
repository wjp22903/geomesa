<%@ var config: spray.json.JsValue %>
<%@ var userCn: String %>
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
    <div class="anchorTop shadowBottom classBanner {{::app.classification.level}}"
         ng-bind="::app.classification.text" ng-style="::app.classBannerStyle"></div>
    <div class="anchorLeftRight" ng-style="::app.betweenClassBannersStyle">
        <st-sidebar></st-sidebar>
        <div class="primaryDisplay anchorTopBottom anchorRight">
            <st-ol3-map id="primaryMap"></st-ol3-map>
            <st-ol3-map-popup-builder></st-ol3-map-popup-builder>
            <st-header></st-header>
            <st-wizard></st-wizard>
            <toaster-container toaster-options="{'position-class':'toast-bottom-right'}"></toaster-container>
        </div>
    </div>
    <div class="anchorBottom shadowTop classBanner {{::app.classification.level}}"
         ng-bind="::app.classification.text" ng-style="::app.classBannerStyle"></div>

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
</body>
</html>
