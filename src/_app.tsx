import { AppsInToss } from '@apps-in-toss/framework';
import { InitialProps } from '@granite-js/react-native';
import { TDSProvider } from '@toss/tds-react-native';
import { Component, PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { context } from '../require.context';
import { MyfarmProvider } from '../stores/MyfarmContext';

class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 20 }}>🐾</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#191F28', marginBottom: 10 }}>
            일시적인 오류가 발생했어요
          </Text>
          <Text style={{ fontSize: 14, color: '#8B95A1', textAlign: 'center', lineHeight: 22 }}>
            잠시 후 다시 시도해주세요.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <TDSProvider>
      <ErrorBoundary>
        <MyfarmProvider>
          {children}
        </MyfarmProvider>
      </ErrorBoundary>
    </TDSProvider>
  );
}

export default AppsInToss.registerApp(AppContainer, { context });
