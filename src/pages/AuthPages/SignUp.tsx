import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Daftar Akun | JKT48Connect - GiStream"
        description="Buat akun JKT48Connect melalui aplikasi GiStream untuk menikmati live show, pembelian tiket, dan membership eksklusif JKT48."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
