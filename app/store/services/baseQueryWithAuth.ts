import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs } from "@reduxjs/toolkit/query";
import { clearLoginDetails } from "../features/authSlice";
import { backendURL } from "@/app/utils/properties";

export const baseQuery = fetchBaseQuery({
  baseUrl: backendURL,
  prepareHeaders: (headers) => {
      headers.set("OS", "WEB");
      headers.set("MOD", "CHUPS");
      headers.set("VER", "3");

    if (typeof document !== "undefined") {
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("token="))
        ?.split("=")[1];

      if (token) {
        headers.set("X-XSRF-TOKEN", token);
      }
    }

    return headers;
  },
});

/**
 * 🔥 Wrapper to catch 401 globally
 */
export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  unknown
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    // clear redux auth
    api.dispatch(clearLoginDetails());

    // clear cookie
    if (typeof document !== "undefined") {
      document.cookie =
        "token=null;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/";
    }

    // redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return result;
};
