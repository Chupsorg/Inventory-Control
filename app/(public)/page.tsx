"use client"
import Image from 'next/image'
import React from 'react'
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap'

export default function page() {
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

                          <Form>
                              <Form.Group className="mb-3">
                                  <Form.Control
                                      type="email"
                                      placeholder="Email Id"
                                  />
                              </Form.Group>

                              <Form.Group className="mb-3 position-relative">
                                  <Form.Control
                                      type="password"
                                      placeholder="Password"
                                  />
                                  <span className="password-eye"><Image src={"/eye-icon.svg"} height={18} width={18} alt="eye-icon" /></span>
                              </Form.Group>
                            <div className='align-center'>
                              <Form.Check
                                  type="checkbox"
                                  label="Remember me"
                                  className="mb-4 font-13 "
                              />
                            </div>

                              <div className="d-flex justify-content-center">
                                  <Button className="btn-outline me-2 px-5">Cancel</Button>
                                  <Button className="btn-filled px-5">Login</Button>
                              </div>
                          </Form>
                      </Card.Body>
                  </Card>
              </Col>
          </Row>
      </Container>
  )
}
