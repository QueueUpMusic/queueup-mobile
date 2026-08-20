import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getServerHostname } from '@/config/server';
import { checkServerConnectivity } from '@/lib/api';
import { ServerStatus } from '@/types';
import { Spacing, MaxContentWidth } from '@/constants/theme';

/**
 * Initial QueueUp app shell screen.
 * 
 * Shows:
 * - QueueUp title
 * - Current server hostname
 * - Server connectivity status
 * 
 * This will eventually become the login/signup screen.
 */
export default function QueueUpShellScreen() {
  // Get server hostname once at mount (it's static configuration)
  const serverHost = useMemo(() => getServerHostname(), []);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    state: 'checking',
  });

  useEffect(() => {
    // Check server connectivity
    let isMounted = true;

    async function checkConnectivity() {
      const result = await checkServerConnectivity();
      
      if (!isMounted) return;

      if (result.reachable) {
        setServerStatus({
          state: 'reachable',
          requiresAuth: result.requiresAuth,
        });
      } else {
        setServerStatus({
          state: 'unreachable',
          error: result.error || 'Unknown error',
        });
      }
    }

    checkConnectivity();

    return () => {
      isMounted = false;
    };
  }, []);

  // Format the status display text
  function getStatusText(): string {
    switch (serverStatus.state) {
      case 'checking':
        return 'Checking...';
      case 'reachable':
        if (serverStatus.requiresAuth) {
          return 'Server reachable (authentication required)';
        }
        return 'Server reachable';
      case 'unreachable':
        return `Unable to reach server: ${serverStatus.error}`;
      default:
        return 'Unknown status';
    }
  }

  // Get the status color based on state
  function getStatusColor() {
    switch (serverStatus.state) {
      case 'checking':
        return '#208AEF';
      case 'reachable':
        return '#28a745';
      case 'unreachable':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>QueueUp</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Server</Text>
            <Text style={styles.value} selectable={true}>
              {serverHost}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {serverStatus.state === 'checking' ? (
                <ActivityIndicator size="small" color={getStatusColor()} />
              ) : (
                <Text style={[styles.value, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.buttonPlaceholder} />

        {Platform.OS === 'web' && (
          <View style={styles.webNote}>
            <Text style={styles.webNoteText}>
              Web preview - use Expo Go or development build for native
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#208AEF',
  },
  infoSection: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    color: '#60646C',
  },
  value: {
    fontSize: 16,
    color: '#000000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  buttonPlaceholder: {
    height: Spacing.six,
  },
  webNote: {
    marginTop: Spacing.four,
    padding: Spacing.two,
    backgroundColor: '#F0F0F3',
    borderRadius: Spacing.one,
  },
  webNoteText: {
    fontSize: 12,
    color: '#60646C',
    textAlign: 'center',
  },
});
