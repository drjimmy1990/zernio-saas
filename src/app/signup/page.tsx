import SignUpForm from '@/components/auth/SignUpForm';
import RegistrationComingSoon from '@/components/auth/RegistrationComingSoon';
import { isPublicRegistrationEnabled } from '@/lib/auth/registration';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return isPublicRegistrationEnabled() ? <SignUpForm /> : <RegistrationComingSoon />;
}
