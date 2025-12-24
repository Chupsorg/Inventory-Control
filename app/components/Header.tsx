"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { apiSlice } from "@/app/store/services/apiSlice";
import { setPrimaryItems } from "@/app/store/features/primaryItemsSlice";

export default function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter()
  const dispatch = useDispatch()
  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(";").forEach((cookie) => {
        document.cookie = cookie
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
      });
      router.replace("/");
    } catch (err) {
      console.error("Logout failed", err);
      router.replace("/");
    }
  };
  return (
    <>
      <div className="d-flex align-items-center p-3 border-bottom">
        <Image
          src="/ham-icon.svg"
          width={20}
          height={20}
          alt="ham-icon"
          className="me-3 cursor-pointer"
          onClick={() => setOpen(true)}
        />
        <h3 className="m-0 font-13">Inventory Management</h3>
      </div>

      {open && (
        <div
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`sidebar ${open ? "open" : ""}`}>
        <div className="p-3">
          <div className="d-flex align-items-center p-3">
            <Image
              src="/ham-icon.svg"
              width={20}
              height={20}
              alt="ham-icon"
              className="me-3 cursor-pointer"
              onClick={() => setOpen(true)}
            />
            <h3 className="m-0 font-13">Inventory Management</h3>
          </div>
          <div className="p-3 bg-primary-light border rounded-2 mb-3 cursor-pointer">
            <h4 className="font-14 fw-bold text-primary text-center m-0">Control sheet</h4>
          </div>
          <div className="p-3 bg-primary-light border rounded-2 mb-3 cursor-pointer" onClick={()=>{router.push("/orders")}}>
            <h4 className="font-14 fw-bold text-primary text-center m-0">Orders</h4>
          </div>
          <div className="p-3 bg-primary-light border rounded-2 mb-3 cursor-pointer" onClick={()=>{handleLogout()}}>
            <h4 className="font-14 fw-bold text-primary text-center m-0">Logout</h4>
          </div>
        </div>
      </div>
    </>
  );
}
