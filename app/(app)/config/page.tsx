"use client"
import Image from 'next/image'
import React, { useState, useRef } from 'react'
import { Col, Row, Button, Form, FormControl, Container } from 'react-bootstrap'
import DatePicker, { DateObject } from "react-multi-date-picker";

export default function page() {
  const [range, setRange] = useState<DateObject[] | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = (type: string) => {
    if (!fileInputRef.current) return;
    if (type == "upload") {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.removeAttribute("capture");

    }
    if (type == "photo") {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.setAttribute("capture", "environment");
    }
    fileInputRef.current?.click();
  };

  return (
    <Container fluid className='p-4'>
      <Row>
        <Col>
          <h5 className='font-24 fw-bold'>Setup</h5>
          <DatePicker
            range
            value={range}
            onChange={setRange}
            placeholder="Select date"
            format="DD MMM, YYYY"
            render={(value, openCalendar) => (
              <div className="custom-date-input" onClick={openCalendar}>
                <input
                  type="text"
                  readOnly
                  value={value}
                  placeholder="Select date"
                />
                <img src="/calendar.png" alt="calendar" />
              </div>
            )}
          />
        </Col>
        <Col>
          <Button className="btn-filled float-end">
            Next
          </Button>
        </Col>
      </Row>
      <Row className='mt-3'>
        <Col>
          <h5 className='font-24 fw-bold'>Stock</h5>
          <div className='border rounded-2'>
            <div className='d-flex p-3 border-bottom'>
              <Image src={"/green-tick.svg"} height={16} width={16} alt="green-tick" className='me-1' />
              <h4 className='font-13 m-0'>Stock data found<span className='ms-1 text-primary fw-bold'>View Data</span></h4>
            </div>
            <div className='p-3 d-flex'>
              <div className='border rounded-2 bg-primary-light d-flex p-2 me-3 cursor-pointer' onClick={()=>handleUploadClick("upload")}>
                <Image src={"/upload-file.png"} height={15} width={15} alt="upload-file" />
                <h4 className='font-14 fw-bold text-primary m-0 ms-2'>Upload File</h4>
              </div>
              <div className='border rounded-2 bg-primary-light d-flex p-2 cursor-pointer' onClick={()=>handleUploadClick("photo")}>
                <Image src={"/take-photo.png"} height={15} width={15} alt="upload-file" />
                <h4 className='font-14 fw-bold text-primary m-0 ms-2'>Take Photo</h4>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept="image/*"
                // capture="environment"
                onChange={(e) => console.log(e.target.files)}
              />
            </div>
            <div className='d-flex px-3'>
              <Image src={"/green-tick.svg"} height={16} width={16} alt="green-tick" className='me-1' />
              <h4 className='font-16 fw-bold'>Successfully Uploaded</h4>
            </div>
            <div className='d-flex align-items-center px-3 pb-3'>
              <div className='border rounded-pill py-1 px-2 me-1'>
                sheet 1
              </div>
              <div className='border rounded-pill py-1 px-2 me-1'>
                sheet 2
              </div>
              <div className='border rounded-pill py-1 px-2'>
                sheet 3
              </div>
              <span className='ms-1 text-primary fw-bold font-13'>View Data</span>
            </div>
          </div>
        </Col>
      </Row>
      <Row className='mt-3'>
        <h5 className='font-24 fw-bold mt-3'>Configuration</h5>
        <Col>
          <div className='bg-gray-light rounded-2 border'>
            <div className='border-bottom p-3'>
              <h4 className='font-16 fw-bold'>Delivery Days</h4>
              <div className='d-flex flex-wrap'>
                <Form.Select className="rb-custom-select me-2">
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </Form.Select>
                <Form.Select className="rb-custom-select me-2">
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </Form.Select>
                <div className='d-flex align-items-center justify-content-center border rounded-2 bg-white px-2'>
                  <Image src={"/orange-plus.png"} height={18} width={18} alt='orange-plus' />
                </div>
              </div>
            </div>
            <div className='border-bottom p-3'>
              <h4 className='font-16 fw-bold'>Sales Data</h4>
              <div className='mb-3'>
                <p className='font-13 fw-bold'>Sales Data for Tuesday : <span className='text-secondary fw-normal'>9 Dec 2025 to 11 Dec 2025</span></p>
                <div className='d-flex flex-wrap align-items-center'>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Mon</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Tue</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Wed</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Thu</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Fri</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Sat</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Sun</p>
                  </div>
                  <DatePicker
                    range
                    value={range}
                    onChange={setRange}
                    placeholder="Custom date"
                    format="DD MMM, YYYY"
                    render={(value, openCalendar) => (
                      <div className="custom-date-input" onClick={openCalendar}>
                        <input
                          type="text"
                          readOnly
                          value={value}
                          placeholder="Custom date"
                        />
                        <img src="/calendar.png" alt="calendar" />
                      </div>
                    )}
                  />
                </div>
              </div>
              <div>
                <p className='font-13 fw-bold'>Sales Data for Tuesday : <span className='text-secondary fw-normal'>9 Dec 2025 to 11 Dec 2025</span></p>
                <div className='d-flex flex-wrap align-items-center'>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Mon</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Tue</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Wed</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Thu</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Fri</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Sat</p>
                  </div>
                  <div className='d-flex me-3'>
                    <Form.Check type="checkbox" id="custom-check" className="rb-orange-check" /><p className='font-13 m-0 ms-2'>Sun</p>
                  </div>
                  <DatePicker
                    range
                    value={range}
                    onChange={setRange}
                    placeholder="Custom date"
                    format="DD MMM, YYYY"
                    render={(value, openCalendar) => (
                      <div className="custom-date-input" onClick={openCalendar}>
                        <input
                          type="text"
                          readOnly
                          value={value}
                          placeholder="Custom date"
                        />
                        <img src="/calendar.png" alt="calendar" />
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
            <div className='p-3'>
              <h4 className='font-16 fw-bold'>Rules</h4>
              <div className='d-flex align-items-center'>
                <Form.Check type="checkbox" id="custom-check" className="rb-orange-check me-2" />
                <p className='font-13 m-0 me-2'>Club all weekly freezer items to</p>
                <Form.Select className="rb-custom-select me-2 p-1">
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </Form.Select>
              </div>
            </div>
            <div className='d-flex justify-content-end p-3'>
              <button className='primary-border text-primary fw-bold rounded-1 bg-white font-13'>Save this configuration for future</button>
            </div>
          </div>
        </Col>
      </Row>
      <Button className="btn-filled float-end mt-3 mb-5">Next</Button>
    </Container>
  )
}
