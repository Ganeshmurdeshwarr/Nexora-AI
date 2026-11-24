
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FcGoogle} from "react-icons/fc"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { login } from "../features/auth";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setUserData } from "@/redux/userSlice";

export function LoginForm({ className, ...props }) {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
   const dispatch=useDispatch()


  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      const data=await login(token);
      dispatch(setUserData(data))
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Google login failed:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-white">
            Welcome to Nexora AI
          </CardTitle>

          <CardDescription className="text-sm text-zinc-400">
            Sign in to build and manage your AI agents.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form>
            <FieldGroup>
              <Field>
                <Button
                onClick={handleGoogleLogin}
                  variant="outline"
                  type="button"
                  className="h-12 w-full gap-3 rounded-xl border-white/15 bg-white/0.4 text-sm font-medium text-white transition hover:border-violet-400/50 hover:bg-white/0.8 hover:text-white"
                >
                <FcGoogle/>

                  Login with Google
                </Button>
              </Field>

             
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
