/**
 * The first dragonfish plugin, designed to apply a classifier from a list of pre-trained classifiers.
 */
angular.module('stealth.dragonfish.classifier', [
    'stealth.dragonfish.classifier.wizard'
])

.constant('stealth.dragonfish.classifier.Constant', {
    name: 'Dragonfish Classifier',
    applyEvent: 'dragonfish:classifier:apply'
})

/**
 * Hook up a start menu button to launch the wizard
 */
.run([
'startMenuManager',
'stealth.dragonfish.Constant',
'stealth.dragonfish.classifier.Constant',
'stealth.dragonfish.classifier.wizard.service',
function (startMenuManager, DF, ClassConstant, classifierWizardService) {
    startMenuManager.addButton(ClassConstant.name, DF.icon, classifierWizardService.launchWizard);
}])

/**
 * A 'classifier' class. We require the user to pick a classifier to apply, from a list of objects of this type.
 * For now, we hard-code sample classifiers in the service below.
 */
.factory('stealth.dragonfish.classifier.Classifier', [
function () {
    return function (id, name, space, labels) {
        this.id = id;
        this.name = name;
        this.space = space;
        this.labels = labels;
    };
}])

/**
 * This service should obtain a list of classifiers. In actuality it will be a WPS request (since we're
 * planning on bundling all supporting back-end interfaces into WPS processes). For now, we hard-code some sample data.
 */
.service('stealth.dragonfish.classifier.service', [
'$q',
'stealth.dragonfish.classifier.Classifier',
function ($q, Classifier) {
    this.getClassifiers = function () {
        // memoize WPS results
        return $q.when([
            new Classifier('00abc', 'Hospitals', 'Imagery', ['Hospitals', 'Other']),
            new Classifier('fed42', 'Building Type', 'Fusion', ['Hospital', 'Mall', 'Office Park'])
        ]);
    };
}])
;
