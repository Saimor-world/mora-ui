import { withAuth } from "next-auth/middleware";

export default withAuth({
    secret: "dev_secret_key_change_me_in_prod",
    pages: {
        signIn: "/",
    },
});

export const config = {
    matcher: [
        "/home/:path*",
        "/simple/:path*",
    ],
};
