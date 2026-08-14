// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import HealthTile from './HealthTile.jsx';

afterEach(cleanup);

describe('HealthTile', () => {
  it('renders the component name, status label, and formatted uptime', () => {
    render(<HealthTile name="API" status="operational" uptimePercent={99.95} />);

    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('99.95% uptime')).toBeInTheDocument();
  });

  it('renders the 100.00% boundary for a fully healthy component with no incidents', () => {
    render(<HealthTile name="CDN" status="operational" uptimePercent={100} />);

    expect(screen.getByText('100.00% uptime')).toBeInTheDocument();
  });

  it('renders the 0.00% boundary for a component with zero measured uptime', () => {
    render(<HealthTile name="Legacy Batch" status="major_outage" uptimePercent={0} />);

    expect(screen.getByText('0.00% uptime')).toBeInTheDocument();
  });

  it('shows a distinct label and dot color per health status', () => {
    const { container: operationalContainer } = render(
      <HealthTile name="API" status="operational" uptimePercent={100} />,
    );
    const { container: outageContainer } = render(
      <HealthTile name="DB" status="major_outage" uptimePercent={80} />,
    );

    expect(screen.getByText('Major Outage')).toBeInTheDocument();

    const operationalDot = operationalContainer.querySelector('[data-testid="health-tile-dot"]');
    const outageDot = outageContainer.querySelector('[data-testid="health-tile-dot"]');

    expect(operationalDot.style.backgroundColor).not.toBe('');
    expect(operationalDot.style.backgroundColor).not.toBe(outageDot.style.backgroundColor);
  });

  it('falls back to an Unknown label for an unrecognized health status', () => {
    render(<HealthTile name="Mystery Service" status="not_a_real_status" uptimePercent={50} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
