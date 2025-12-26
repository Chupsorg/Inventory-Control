import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { backendURL } from "@/app/utils/properties";
import { baseQueryWithAuth } from "./baseQueryWithAuth";

interface ApiArgs {
  url: string;
  body?: Record<string, unknown>;
}

interface ApiResponse {
  [key: string]: string | number | boolean | null | object;
}

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    callApi: builder.mutation<ApiResponse, ApiArgs>({
      query: ({ url, body }) => ({
        url,
        method:"POST",
        body,
      }),
    }),
  }),
});

export const { useCallApiMutation } = apiSlice;
