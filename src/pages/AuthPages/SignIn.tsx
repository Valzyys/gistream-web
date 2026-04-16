import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | JKT48Connect - GiStream"
        description="Masuk ke akun JKT48Connect kamu untuk mengakses live show, membership, dan fitur eksklusif GiStream."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
