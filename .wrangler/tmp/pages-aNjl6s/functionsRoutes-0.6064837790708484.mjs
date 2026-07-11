import { onRequest as __api___route___js_onRequest } from "C:\\Users\\joosu\\OneDrive\\바탕 화면\\앱만들기\\오늘의복붙\\functions\\api\\[[route]].js"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___js_onRequest],
    },
  ]