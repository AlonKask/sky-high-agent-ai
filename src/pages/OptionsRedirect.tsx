import { Navigate, useParams } from "react-router-dom";

export default function OptionsRedirect() {
  const { token } = useParams();
  return <Navigate to={`/view-option/${token}`} replace />;
}
