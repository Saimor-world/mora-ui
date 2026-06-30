import { render, screen } from '@testing-library/react';
import { MoraEngineBadge } from '@/components/mora/MoraEngineBadge';

test('renders nothing when there is no engine', () => {
  const { container } = render(<MoraEngineBadge engine={null} />);
  expect(container).toBeEmptyDOMElement();
});

test('shows the engine label and a privacy lock for a local/EU brain', () => {
  render(
    <MoraEngineBadge
      engine={{ provider: 'ollama', model: 'qwen2.5:7b', residency: 'local', label: 'Lokal (EU) · qwen2.5:7b' }}
    />,
  );
  expect(screen.getByText(/Lokal \(EU\) · qwen2\.5:7b/)).toBeInTheDocument();
  expect(screen.getByTestId('mora-engine-residency')).toHaveTextContent(/EU|lokal/i);
});

test('shows a cloud hint for a US provider', () => {
  render(
    <MoraEngineBadge
      engine={{ provider: 'gemini', model: 'gemini-2.5-flash', residency: 'us', label: 'Gemini · gemini-2.5-flash' }}
    />,
  );
  expect(screen.getByText(/Gemini · gemini-2\.5-flash/)).toBeInTheDocument();
  expect(screen.getByTestId('mora-engine-residency')).toHaveTextContent(/cloud|us/i);
});
