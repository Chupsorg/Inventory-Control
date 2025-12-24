"use client"
import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap'
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useDispatch } from "react-redux";
import { setLoginDetails } from "@/app/store/features/authSlice";
import { useRouter } from "next/navigation";

export default function page() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [callApi, { isLoading }] = useCallApiMutation();

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMeNew, setRememberMeNew] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = () => {
            window.history.go(1);
        };
    }, []);
    const validate = () => {
        if (!name || !password) {
            setErrorMessage("Username and password are required");
            return false;
        }
        return true;
    };

    const handleSubmitLogin = async () => {
        if (!validate()) return;

        const rememberMe = rememberMeNew ? "Y" : "N";

        const payload = {
            userId: name,
            password,
            rememberMe,
            country: "US",
            isEmail: "Y",
            mode: "W",
        };

        try {
            const res = await callApi({
                url: "AuthCtl/kiosk_login",
                body: payload,
            }).unwrap();

            if (res && res.token) {
                if (res.cloudKitchenId !== 0) {
                    document.cookie = `XSRF-TOKEN=${res.token};expires=${res.expireTime};path=/`;

                    const data = {
                        userId: name,
                        cloudKitchenName: res.cloudKitchenName,
                        cloudKitchenId: res.cloudKitchenId,
                    };

                    localStorage.setItem("login_Details", JSON.stringify(data));
                    dispatch(
                        setLoginDetails({
                            userId: name,
                            cloudKitchenName: res.cloudKitchenName,
                            cloudKitchenId: res.cloudKitchenId,
                        })
                    );
                    router.push("/orders");
                } else {
                    setErrorMessage(
                        "Configure this login with admin to use partner portal."
                    );
                }
            } else {
                setErrorMessage("Invalid credentials. Please try again.");
            }
        } catch (err) {
            setErrorMessage("Something went wrong. Please try again.");
        }
    };
    return (
        <Container fluid className="login-page vh-100" >
            <div className="login-logo">
                <Image src="/chups_logo.svg" alt="logo" width={90} height={30} />
            </div>

            <Row className="h-100 justify-content-center align-items-center">
                <Col xs={12} sm={10} md={6} lg={4}>
                    <Card className="login-card">
                        <Card.Body>
                            <h3 className="font-27 text-center fw-bold mb-3">
                                Inventory Management
                            </h3>

                            <div className="login-divider">
                                <span className='font-14 fw-bold'>LOGIN</span>
                            </div>
                            {errorMessage && (
                                <p style={{ color: "red", marginBottom: 10 }}>{errorMessage}</p>
                            )}
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Control
                                        type="email"
                                        placeholder="Email Id"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3 position-relative">
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <span className="password-eye"><Image src={"/eye-icon.svg"} height={18} width={18} alt="eye-icon" /></span>
                                </Form.Group>
                                <div className='align-center'>
                                    <Form.Check
                                        type="checkbox"
                                        label="Remember me"
                                        className="mb-4 font-13"
                                        checked={rememberMeNew}
                                        onChange={(e) => setRememberMeNew(e.target.checked)}
                                    />
                                </div>

                                <div className="d-flex justify-content-center">
                                    <Button className="btn-outline me-2 px-5">Cancel</Button>
                                    <Button className="btn-filled px-5" onClick={() => { handleSubmitLogin() }}>{isLoading ? "Logging in..." : "Login"}</Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}
