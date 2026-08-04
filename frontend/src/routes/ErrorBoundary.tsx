import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorPage } from '@/pages/ErrorPage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Render sırasında oluşan beklenmeyen hataları yakalar ve beyaz ekran yerine
 * kurtarılabilir bir hata sayfası gösterir.
 *
 * (Sorgu/istek hataları TanStack Query tarafından yönetilir ve ilgili bileşende
 * `ErrorState` ile gösterilir; buraya yalnızca render hataları düşer.)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Gerçek bir hata izleme servisi bağlanacaksa giriş noktası burasıdır.
    console.error('Beklenmeyen arayüz hatası:', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorPage error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
