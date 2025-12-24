"use client"
import Image from 'next/image'
import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Col, Row, Button, Form, Container, Modal, Spinner } from 'react-bootstrap'
import DatePicker, { DateObject } from "react-multi-date-picker";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { getComingWeekday, getDateRange, getDayName } from '@/app/utils/properties';
import { useCallApiMutation } from '@/app/store/services/apiSlice';
import { useRouter } from 'next/navigation';
import { setConfig } from "@/app/store/features/configSlice";
import { TableColumn } from 'react-data-table-component';
import Datatable from '@/app/components/Datatable';

type DayCode = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
type DeliveryDate = {
  day: DayCode;
  date: Date;
  date_range: string;
  custom_date_range: DateObject[];
  days: DayCode[];
};

type AssemblyRow = {
  id: number;
  item: string;
  fridge_freeze: string;
  available_qty: number;
  uom: string;
  item_name: string;
};

export default function page() {
  const [callApi, { isLoading }] = useCallApiMutation();
  const [uploadloader, setuploadloader] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );
  const rehydrated = useSelector(
    (state: RootState) => state._persist?.rehydrated
  );
  const [stockDate, setstockDate] = useState<DateObject | null>(new DateObject());
  const [stockDataId, setstockDataId] = useState(0);
  const [configDataId, setconfigDataId] = useState(0);
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDate[]>([
    {
      day: "TUE",
      date: getComingWeekday("TUE"),
      date_range: "",
      custom_date_range: [],
      days: ["WED", "THU", "FRI"],
    },
    {
      day: "FRI",
      date: getComingWeekday("FRI"),
      date_range: "",
      custom_date_range: [],
      days: ["MON", "SAT", "SUN"],
    }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileList, setfileList] = useState<File[]>([]);
  const [isUploadsuccess, setisUploadsuccess] = useState(false);
  const [stockJson, setstockJson] = useState<any[]>([]);
  const [assemblyModal, setassemblyModal] = useState<boolean>(false);
  const assemblyColumns: TableColumn<AssemblyRow>[] = [
    {
      name: "#",
      width: "60px",
      cell: (_row, index) => index + 1,
      center: true
    },
    {
      name: "Item",
      cell: (row) => row.item_name,
    },
    {
      name: "Freezer/Fridge",
      cell: (row) => row.fridge_freeze,
      center: true,
      width: "250px"
    },
    {
      name: "Available Qty",
      cell: (row) => (
        <Form.Control
          type="number"
          className='text-center'
          defaultValue={row.available_qty}
          style={{ width: 90 }}
          onChange={(e) => {
            handleEditAssembly(
              row.id,
              Number(e.target.value)
            )
          }}
        />
      ),
      center: true,
      width: "250px"
    },
    {
      name: "UOM",
      cell: (row) => row.uom,
      center: true,
      width: "250px"
    },
  ];

  useEffect(() => {
    if (!rehydrated) return;
    if (!loginDetails) return;
    fetchConfig();
    fetchStock();
  }, [rehydrated, loginDetails]);

  const fetchConfig = async () => {
    // config list
    try {
      let res = await callApi({
        url: `StoreCtl/get-inventory-data/CONFIG/${loginDetails?.cloudKitchenId}`,
      }).unwrap();
      if (res.status) {
        const updatedData =
          res.object[0]?.dataValue?.map((con: { date: Date; day: DayCode }) => ({
            ...con,
            date: new Date(con.date),
          })) ?? [];
        setDeliveryDates(updatedData)
        setconfigDataId(res.object[0]?.dataId)
      } else {
        alert(res.message)
      }
    } catch (error) {
      console.error("API error", error);
    }
  }

  const fetchStock = async () => {
    // stock data
    try {
      let res = await callApi({
        url: `StoreCtl/get-inventory-data/STOCK/${loginDetails?.cloudKitchenId}`,
      }).unwrap();
      if (res.status) {
        const updatedRes = res.object[0]?.dataValue?.map(
          (data: any, i: number) => ({
            ...data,
            id: i + 1,
          })
        );
        setstockJson(updatedRes)
        setstockDataId(res.object[0]?.dataId)
      } else {
        setstockJson([])
      }
    } catch (error) {

    }
  }

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

  const handleMultipleUpload = async (files: FileList) => {
    setfileList(Array.from(files));
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("file", file);
    });
    setuploadloader(true)
    try {
      const res = await callApi({
        url: `StoreCtl/upload-stock-file/${loginDetails?.cloudKitchenId}`,
        body: formData,
      }).unwrap();
      fetchStock()
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setuploadloader(false)
    }
  };

  const toggleDay = (targetDay: DeliveryDate['day'], day: DeliveryDate['day']) => {
    setDeliveryDates(prev =>
      prev.map(item => {
        if (item.day !== targetDay) return item;

        const exists = item.days.includes(day);

        return {
          ...item,
          days: exists
            ? item.days.filter(d => d !== day)
            : [...item.days, day],
          custom_date_range: []
        };
      })
    );
  };
  const formattedRange = useMemo(() => {
    if (!stockDate) return "--";
    const { startDate, endDate } = getDateRange(
      stockDate.toDate(),
      "week",
      1,
      "subtract"
    );
    return `${startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} - ${endDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;
  }, [stockDate]);

  const isDayAlreadyUsed = (
    day: DeliveryDate['day'],
    currentIndex: number
  ) => {
    return deliveryDates.some(
      (item, index) => item.day === day && index !== currentIndex
    );
  };

  const handleSaveConfig = async () => {
    try {
      let params = {
        "data_id": configDataId,
        "cloud_kitchen_id": loginDetails?.cloudKitchenId,
        "data_type": "CONFIG",
        "status": "A",
        "data_value": deliveryDates
      }
      let res = await callApi({
        url: `StoreCtl/save-or-update-inventory-data`,
        body: params
      }).unwrap()
      if (res.status) {
        dispatch(setConfig(deliveryDates));
        router.push("/primaryitems")
      } else {
        alert(res.message)
      }
    } catch (err) {
      alert("error")
    }
  }

  const handleEditAssembly = (id: number, value: number) => {
    setstockJson((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, available_qty: value }
          : item
      )
    );
  };

  const HandleUpdateAssembly = async () => {
    try {
      let params = {
        "data_id": stockDataId,
        "cloud_kitchen_id": loginDetails?.cloudKitchenId,
        "data_type": "STOCK",
        "status": "A",
        "data_value": stockJson
      }
      let res = await callApi({
        url: `StoreCtl/save-or-update-inventory-data`,
        body: params
      }).unwrap()
      if (res.status) {
        setassemblyModal(false)
        fetchStock()
      } else {
        alert(res.message)
      }
    } catch (err) {
      alert("error")
    }
  }

  return (
    <Container fluid className='p-4'>
      <Row>
        <Col xs={{ order: 1 }} md={{ order: 0 }}>
          <h5 className='font-24 fw-bold'>Setup</h5>
          <div className='d-flex'>
            <Form.Select className="rb-custom-select me-2">
              <option>Week</option>
              <option>Month</option>
            </Form.Select>
            <DatePicker
              value={stockDate}
              onChange={setstockDate}
              placeholder="Select date"
              format="DD MMM, YYYY"
              maxDate={new DateObject().subtract(1, "day")}
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
          </div>
        </Col>
        <Col>
          <Button className="btn-filled float-end" onClick={() => { handleSaveConfig() }}>
            Next
          </Button>
        </Col>
      </Row>
      <Row className='mt-3'>
        <Col>
          <h5 className='font-24 fw-bold'>Stock</h5>
          <div className='border rounded-2'>
            {!uploadloader && stockJson.length > 0 && <div className='d-flex p-3 border-bottom'>
              <Image src={"/green-tick.svg"} height={16} width={16} alt="green-tick" className='me-1' />
              <h4 className='font-13 m-0'>Stock data found<span className='ms-1 text-primary fw-bold cursor-pointer' onClick={() => { setassemblyModal(true) }}>View Data</span></h4>
            </div>}
            <div className='p-3 d-flex'>
              <div className='border rounded-2 bg-primary-light d-flex p-2 me-3 cursor-pointer' onClick={() => handleUploadClick("upload")}>
                <Image src={"/upload-file.png"} height={15} width={15} alt="upload-file" />
                <h4 className='font-14 fw-bold text-primary m-0 ms-2'>Upload File</h4>
              </div>
              <div className='border rounded-2 bg-primary-light d-flex p-2 cursor-pointer' onClick={() => handleUploadClick("photo")}>
                <Image src={"/take-photo.png"} height={15} width={15} alt="upload-file" />
                <h4 className='font-14 fw-bold text-primary m-0 ms-2'>Take Photo</h4>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept="image/*"
                multiple
                // capture="environment"
                onChange={(e) => { e.target.files ? handleMultipleUpload(e.target.files) : "" }}
              />
            </div>
            {uploadloader && <div className='d-flex px-3'>
              <Spinner animation="border" size="sm" className='me-2' />
              <h4 className='font-16 fw-bold'>File uploading...</h4>
            </div>}
            {isUploadsuccess && <div className='d-flex px-3'>
              <Image src={"/green-tick.svg"} height={16} width={16} alt="green-tick" className='me-1' />
              <h4 className='font-16 fw-bold'>Successfully Uploaded</h4>
            </div>}
            {/* {fileList.length > 0 && <div className='d-flex align-items-center px-3 pb-3'>
              {fileList?.map((files, i) => (
                <div className='d-flex align-items-center border rounded-pill py-1 px-2 me-1'>
                  <p className='m-0 me-2'>sheet {i + 1}</p><Image src={'x-mark.svg'} height={10} width={10} alt="x-mark" />
                </div>
              ))}
              <span className='ms-1 text-primary fw-bold font-13'>View Data</span>
            </div>} */}
          </div>
        </Col>
      </Row>
      <Row className=''>
        <h5 className='font-24 fw-bold mt-3'>Configuration</h5>
        <Col>
          <div className='bg-gray-light rounded-2 border'>
            <div className='border-bottom p-3'>
              <h4 className='font-16 fw-bold'>Delivery Days</h4>
              <div className='d-flex flex-wrap'>
                {deliveryDates?.map((dates, index) => (
                  <Form.Select key={index} className="rb-custom-select me-2" value={dates.day} onChange={(e) => {
                    const selectedDay = e.target.value as DeliveryDate['day'];

                    if (isDayAlreadyUsed(selectedDay, index)) {
                      alert(`${selectedDay} is already selected`);
                      return;
                    }

                    setDeliveryDates(prev =>
                      prev.map((item, i) =>
                        i === index ? { ...item, day: selectedDay, date: getComingWeekday(selectedDay) } : item
                      )
                    );
                  }}>
                    <option value={"MON"}>Monday</option>
                    <option value={"TUE"}>Tuesday</option>
                    <option value={"WED"}>Wednesday</option>
                    <option value={"THU"}>Thursday</option>
                    <option value={"FRI"}>Friday</option>
                    <option value={"SAT"}>Saturday</option>
                    <option value={"SUN"}>Sunday</option>
                  </Form.Select>
                ))}
                <div className='d-flex align-items-center justify-content-center border rounded-2 bg-white px-2' onClick={() => {
                  setDeliveryDates(prev => [
                    ...prev,
                    {
                      day: 'MON',
                      date: getComingWeekday("MON"),
                      date_range: '',
                      custom_date_range: [],
                      days: [],
                    },
                  ]);
                }}>
                  <Image src={"/orange-plus.png"} height={18} width={18} alt='orange-plus' />
                </div>
              </div>
            </div>
            <div className='border-bottom p-3'>
              <h4 className='font-16 fw-bold'>Sales Data</h4>
              {deliveryDates?.map((dates, index) => (
                <div className='mb-3' key={index}>
                  <p className='font-13 fw-bold'>Sales Data for {getDayName(dates.date)} :
                    <span className='text-secondary fw-normal'> {dates.custom_date_range.length > 0 ?
                      dates.custom_date_range.length === 2
                        ? `${dates.custom_date_range[0].toDate().toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })} - ${dates.custom_date_range[1].toDate().toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}` : ""
                      : formattedRange}
                    </span>
                  </p>
                  <div className='d-flex flex-wrap align-items-center'>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("MON")} onChange={() => toggleDay(dates.day, "MON")} /><p className='font-13 m-0 ms-2'>Mon</p>
                    </div>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("TUE")} onChange={() => toggleDay(dates.day, "TUE")} /><p className='font-13 m-0 ms-2'>Tue</p>
                    </div>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("WED")} onChange={() => toggleDay(dates.day, "WED")} /><p className='font-13 m-0 ms-2'>Wed</p>
                    </div>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("THU")} onChange={() => toggleDay(dates.day, "THU")} /><p className='font-13 m-0 ms-2'>Thu</p>
                    </div>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("FRI")} onChange={() => toggleDay(dates.day, "FRI")} /><p className='font-13 m-0 ms-2'>Fri</p>
                    </div>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("SAT")} onChange={() => toggleDay(dates.day, "SAT")} /><p className='font-13 m-0 ms-2'>Sat</p>
                    </div>
                    <div className='d-flex me-3'>
                      <Form.Check type="checkbox" id={`custom-check-${dates.day}-MON`} className="rb-orange-check" checked={dates.days?.includes("SUN")} onChange={() => toggleDay(dates.day, "SUN")} /><p className='font-13 m-0 ms-2'>Sun</p>
                    </div>
                    <DatePicker
                      range
                      value={dates.custom_date_range}
                      onChange={(value) => {
                        setDeliveryDates(prev =>
                          prev.map(item =>
                            item.day === dates.day
                              ? { ...item, custom_date_range: value as DateObject[], days: [] }
                              : item
                          )
                        );
                      }}
                      placeholder="Custom date"
                      format="DD MMM, YYYY"
                      maxDate={new DateObject().subtract(1, "day")}
                      render={(value, openCalendar) => (
                        <div className="custom-date-input" onClick={openCalendar}>
                          <input
                            type="text"
                            readOnly
                            value={value}
                            placeholder="Custom date"
                          />
                          {/* <img src="/calendar.png" alt="calendar" /> */}
                        </div>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className='p-3'>
              <h4 className='font-16 fw-bold'>Rules</h4>
              <div className='d-flex align-items-center'>
                <Form.Check type="checkbox" id="custom-check" className="rb-orange-check me-2" />
                <p className='font-13 m-0 me-2'>Club all weekly freezer items to</p>
                <Form.Select className="rb-custom-select me-2 p-1">
                  <option value={""}>Select</option>
                  {deliveryDates?.map(dates => (
                    <option value={dates.day} key={dates.day}>{getDayName(dates.date)}</option>
                  ))}
                </Form.Select>
              </div>
              <div className='d-flex align-items-center mt-3'>
                <Form.Check type="checkbox" id="custom-check" className="rb-orange-check me-2" />
                <p className='font-13 m-0 me-2'>Club all weekly fridge items to</p>
                <Form.Select className="rb-custom-select me-2 p-1">
                  <option value={""}>Select</option>
                  {deliveryDates?.map(dates => (
                    <option value={dates.day} key={dates.day}>{getDayName(dates.date)}</option>
                  ))}
                </Form.Select>
              </div>
            </div>
            {/* <div className='d-flex justify-content-end p-3'>
              <button className='primary-border text-primary fw-bold rounded-1 bg-white font-13'>Save this configuration for future</button>
            </div> */}
          </div>
        </Col>
      </Row>
      <Button className="btn-filled float-end mt-3 mb-5">Next</Button>
      <Modal
        show={assemblyModal}
        onHide={() => { setassemblyModal(false) }}
        fullscreen
        backdrop="static"
      >
        <Modal.Header className='p-2'>
          <Modal.Title className='font-14'>Stock Data</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Your full page content */}
          <div className='d-flex align-items-center justify-content-between'>
            <p className='font-24 fw-bold'>{stockJson?.length} Assembly Items</p>
            <div>
              <Button className="btn-outline text-primary me-2" onClick={() => { setassemblyModal(false) }}>close</Button>
              <Button className="btn-filled" onClick={() => { HandleUpdateAssembly() }}>save</Button>
            </div>
          </div>
          <div className='mt-4'>
            <Datatable<AssemblyRow>
              columns={assemblyColumns}
              rowData={stockJson}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className='border-0'>
          <div>
            <Button className="btn-outline text-primary me-2" onClick={() => { setassemblyModal(false) }}>close</Button>
            <Button className="btn-filled">save</Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
