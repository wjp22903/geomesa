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

<body ng-class="{'body-targetRank': isActiveNavItem('/targetRank'), 'body-siteRank': isActiveNavItem('/siteRank')}">
    <div class="anchorTop classBanner {{app.classification.level}}"
         ng-bind="app.classification.text" ng-style="app.classBannerStyle"></div>
    <div class="betweenClassBanners" ng-style="app.betweenClassBannersStyle">
        <div ng-include="'common/nav/navBar.tpl.html'"
             ng-style="app.navBarStyle" ng-if="!CONFIG.app.hideNavBar"></div>
        <div ng-view style="position:absolute;bottom:0;left:0;right:0;"
             ng-style="app.viewStyle"></div>
    </div>
    <div class="anchorBottom classBanner {{app.classification.level}}"
         ng-bind="app.classification.text" ng-style="app.classBannerStyle"></div>
</body>
</html>
