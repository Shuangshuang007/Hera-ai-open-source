import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 可在此同步用户信息到数据库
      return true;
    },
    async jwt({ token, user, account }) {
      // 可自定义token内容
      return token;
    },
    async session({ session, token, user }) {
      // 可自定义session内容
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 登录成功后跳转到Profile
      return "/profile";
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 24 * 60 * 60, // 15天
  },
});

export { handler as GET, handler as POST }; 