package vn.memay.cache;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.assertj.core.api.Assertions.assertThat;

class PublicCacheInvalidationTest {
    @Test
    void onlyRequestsInvalidationAfterCommitAndKeepsNewerChangesPending() {
        var cache = new PublicCacheInvalidation("", "", new tools.jackson.databind.ObjectMapper());
        TransactionSynchronizationManager.initSynchronization();
        try {
            cache.changed();
            assertThat(cache.pending()).isFalse();
            var synchronization = TransactionSynchronizationManager.getSynchronizations().getFirst();
            synchronization.afterCommit();
            assertThat(cache.pending()).isTrue();
            long version = cache.revision();
            synchronization.afterCommit();
            cache.purged(version);
            assertThat(cache.pending()).isTrue();
            cache.purged(cache.revision());
            assertThat(cache.pending()).isFalse();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void rollbackDoesNotInvalidateAndIncompleteConfigurationDisablesCaching() {
        var cache = new PublicCacheInvalidation("a".repeat(32), "", new tools.jackson.databind.ObjectMapper());
        assertThat(cache.enabled()).isFalse();
        TransactionSynchronizationManager.initSynchronization();
        try {
            cache.changed();
            TransactionSynchronizationManager.getSynchronizations().getFirst().afterCompletion(1);
            assertThat(cache.pending()).isFalse();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void purgeFailureRetainsPendingChangesAndSuccessAcknowledgesOnlyItsSnapshot() throws Exception {
        var client = org.mockito.Mockito.mock(java.net.http.HttpClient.class);
        var response = org.mockito.Mockito.mock(java.net.http.HttpResponse.class);
        org.mockito.Mockito.when(client.send(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<String>>any()))
                .thenReturn(response);
        org.mockito.Mockito.when(response.statusCode()).thenReturn(503);
        var failed = new PublicCacheInvalidation("a".repeat(32), "test-token",
                new tools.jackson.databind.ObjectMapper(), client);
        failed.changed();
        failed.flush();
        assertThat(failed.pending()).isTrue();

        org.mockito.Mockito.when(response.statusCode()).thenReturn(200);
        org.mockito.Mockito.when(response.body()).thenReturn("{\"success\":true}");
        var successful = new PublicCacheInvalidation("a".repeat(32), "test-token",
                new tools.jackson.databind.ObjectMapper(), client);
        successful.changed();
        successful.flush();
        assertThat(successful.pending()).isFalse();
    }
}
