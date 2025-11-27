import { Turnstile } from '@marsidev/react-turnstile';

interface SimpleTurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
}

export function SimpleTurnstile({ onSuccess, onError }: SimpleTurnstileProps) {
  const siteKey = 'TURNSTILE_SITE_KEY' in import.meta.env 
    ? import.meta.env.TURNSTILE_SITE_KEY 
    : '0x4AAAAAAAx4gqQj3V4K4Y8f'; // Fallback to configured key

  return (
    <div className="flex justify-center my-4">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}
