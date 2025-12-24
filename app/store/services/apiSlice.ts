import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { backendURL } from "@/app/utils/properties";
import { baseQueryWithAuth } from "./baseQueryWithAuth";

interface ApiArgs {
  url: string;
  body?: any;
}

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    callApi: builder.mutation<any, ApiArgs>({
      query: ({ url, body }) => ({
        url,
        method:"POST",
        body,
      }),
    }),
  }),
});

export const { useCallApiMutation } = apiSlice;
