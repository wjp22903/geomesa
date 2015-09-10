/**
 * Similarity search results can be treated pretty similarly to classification results. This module provides
 * the services for running a similarity search.
 */
angular.module('stealth.dragonfish.similarity', [
    'stealth.dragonfish.similarity.runner'
])

.constant('stealth.dragonfish.similarity.Constant', {
    applyEvent: 'dragonfish:simsearch:apply'
})
;
