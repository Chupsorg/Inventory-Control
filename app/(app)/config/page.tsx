"use client";
import Image from "next/image";
import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Col,
  Row,
  Button,
  Form,
  Container,
  Modal,
  Spinner,
} from "react-bootstrap";
import DatePicker, { DateObject } from "react-multi-date-picker";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import {
  getComingWeekday,
  getDateRange,
  getDayName,
} from "@/app/utils/properties";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useRouter } from "next/navigation";
import { setConfig } from "@/app/store/features/configSlice";
import { TableColumn } from "react-data-table-component";
import Datatable from "@/app/components/Datatable";

type DayCode = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
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

export default function Page() {
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

  const [stockDate, setstockDate] = useState<DateObject | null>(
    new DateObject()
  );
  const [stockDataId, setstockDataId] = useState(0);
  const [configDataId, setconfigDataId] = useState(0);
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDate[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileList, setfileList] = useState<File[]>([]);
  const [isUploadsuccess, setisUploadsuccess] = useState(false);
  const [stockJson, setstockJson] = useState<AssemblyRow[]>([]);
  const [assemblyModal, setassemblyModal] = useState<boolean>(false);

  const handleEditAssembly = (id: number, value: number) => {
    setstockJson((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available_qty: value } : item
      )
    );
  };

  const assemblyColumns: TableColumn<AssemblyRow>[] = useMemo(
    () => [
      {
        name: "#",
        width: "60px",
        cell: (_row, index) => index + 1,
        center: true,
      },
      {
        name: "Item",
        cell: (row) => row.item_name,
      },
      {
        name: "Freezer/Fridge",
        cell: (row) => row.fridge_freeze,
        center: true,
        width: "250px",
      },
      {
        name: "Available Qty",
        cell: (row) => (
          <Form.Control
            type="number"
            className="text-center"
            value={row.available_qty}
            style={{ width: 90 }}
            onChange={(e) => {
              handleEditAssembly(row.id, Number(e.target.value));
            }}
          />
        ),
        center: true,
        width: "250px",
      },
      {
        name: "UOM",
        cell: (row) => row.uom,
        center: true,
        width: "250px",
      },
    ],
    [stockJson]
  );

  useEffect(() => {
    const initData = async () => {
      if (!rehydrated || !loginDetails) return;

      // Fetch Config
      try {
        let res = await callApi({
          url: `StoreCtl/get-inventory-data/CONFIG/${loginDetails?.cloudKitchenId}`,
        }).unwrap();
        if (res.status) {
          const updatedData =
            res.object[0]?.dataValue?.map(
              (con: { date: Date; day: DayCode }) => ({
                ...con,
                date: new Date(con.date),
              })
            ) ?? [];
          setDeliveryDates(updatedData);
          setconfigDataId(res.object[0]?.dataId);
        } else {
          alert(res.message);
        }
      } catch (error) {
        console.error("API error fetching config", error);
      }

      // Fetch Stock
      try {
        const res = await callApi({
          url: `StoreCtl/get-inventory-data/STOCK/${loginDetails?.cloudKitchenId}`,
        }).unwrap();
        if (res.status) {
          const updatedRes = res.object[0]?.dataValue?.map(
            (data: any, i: number) => ({
              ...data,
              id: i + 1,
            })
          );
          setstockJson(updatedRes);
          setstockDataId(res.object[0]?.dataId);
        } else {
          setstockJson([]);
        }
      } catch (error) {
        console.error("API error fetching stock", error);
      }
    };

    initData();
  }, [rehydrated, loginDetails, callApi]);

  // Reload stock specifically (used after upload/update)
  const reloadStock = async () => {
    try {
      const res = await callApi({
        url: `StoreCtl/get-inventory-data/STOCK/${loginDetails?.cloudKitchenId}`,
      }).unwrap();
      if (res.status) {
        const updatedRes = res.object[0]?.dataValue?.map(
          (data: any, i: number) => ({
            ...data,
            id: i + 1,
          })
        );
        setstockJson(updatedRes);
        setstockDataId(res.object[0]?.dataId);
        return res;
      } else {
        setstockJson([]);
        return res;
      }
    } catch (error) {
      console.error(error);
    }
  };

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

    // Start Loading
    setuploadloader(true);
    setisUploadsuccess(false); // Reset success state

    try {
      const res = await callApi({
        url: `StoreCtl/upload-stock-file/${loginDetails?.cloudKitchenId}`,
        body: formData,
      }).unwrap();

      if (res.status) {
        // KEEP LOADER TRUE - Wait for stock update polling
        const callFetchStock = setInterval(async () => {
          const stock = await reloadStock();
          if (stock && stock.status) {
            setisUploadsuccess(true);
            setuploadloader(false); // STOP Loading only when stock is found
            clearInterval(callFetchStock);
          }
        }, 5000);
      } else {
        alert(res.message);
        setisUploadsuccess(false);
        setuploadloader(false); // Stop loading on API failure
      }
    } catch (err) {
      console.error("Upload failed", err);
      setuploadloader(false); // Stop loading on Network failure
    }
    // Do NOT put setuploadloader(false) in finally block, as it kills the loader before polling finishes
  };

  const toggleDay = (
    targetDay: DeliveryDate["day"],
    day: DeliveryDate["day"]
  ) => {
    setDeliveryDates((prev) =>
      prev.map((item) => {
        if (item.day !== targetDay) return item;

        const exists = item.days.includes(day);

        return {
          ...item,
          days: exists
            ? item.days.filter((d) => d !== day)
            : [...item.days, day],
          custom_date_range: [],
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
    return `${startDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} - ${endDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }, [stockDate]);

  const isDayAlreadyUsed = (day: DeliveryDate["day"], currentIndex: number) => {
    return deliveryDates.some(
      (item, index) => item.day === day && index !== currentIndex
    );
  };

  const handleSaveConfig = async () => {
    try {
      let params = {
        data_id: configDataId,
        cloud_kitchen_id: loginDetails?.cloudKitchenId,
        data_type: "CONFIG",
        status: "A",
        data_value: deliveryDates,
      };
      let res = await callApi({
        url: `StoreCtl/save-or-update-inventory-data`,
        body: params,
      }).unwrap();
      if (res.status) {
        dispatch(setConfig(deliveryDates));
        router.push("/primaryitems");
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("error");
    }
  };

  const HandleUpdateAssembly = async () => {
    try {
      let params = {
        data_id: stockDataId,
        cloud_kitchen_id: loginDetails?.cloudKitchenId,
        data_type: "STOCK",
        status: "A",
        data_value: stockJson,
      };
      let res = await callApi({
        url: `StoreCtl/save-or-update-inventory-data`,
        body: params,
      }).unwrap();
      if (res.status) {
        setassemblyModal(false);
        reloadStock();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("error");
    }
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col xs={{ order: 1 }} md={{ order: 0 }}>
          <h5 className="font-24 fw-bold">Setup</h5>
          <div className="d-flex">
            <Form.Select
              className="rb-custom-select me-2"
              disabled={uploadloader}
            >
              <option>Week</option>
              <option>Month</option>
            </Form.Select>
            <DatePicker
              value={stockDate}
              onChange={setstockDate}
              placeholder="Select date"
              format="DD MMM, YYYY"
              disabled={uploadloader}
              maxDate={new DateObject().subtract(1, "day")}
              render={(value, openCalendar) => (
                <div
                  className="custom-date-input"
                  onClick={!uploadloader ? openCalendar : undefined}
                  style={{
                    cursor: uploadloader ? "not-allowed" : "pointer",
                    opacity: uploadloader ? 0.6 : 1,
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value={value}
                    placeholder="Select date"
                    disabled={uploadloader}
                  />
                  <img src="/inventorymanagement/calendar.png" alt="calendar" />
                </div>
              )}
            />
          </div>
        </Col>
        <Col>
          <Button
            className="btn-filled float-end"
            disabled={uploadloader}
            onClick={() => {
              handleSaveConfig();
            }}
          >
            Next
          </Button>
        </Col>
      </Row>
      <Row className="mt-3">
        <Col>
          <h5 className="font-24 fw-bold">Stock</h5>
          <div className="border rounded-2">
            {!uploadloader && stockJson.length > 0 && (
              <div className="d-flex p-3 border-bottom">
                <Image
                  src={"/inventorymanagement/green-tick.svg"}
                  height={16}
                  width={16}
                  alt="green-tick"
                  className="me-1"
                />
                <h4 className="font-13 m-0">
                  Stock data found
                  <span
                    className={`ms-1 text-primary fw-bold ${
                      uploadloader ? "" : "cursor-pointer"
                    }`}
                    style={{
                      pointerEvents: uploadloader ? "none" : "auto",
                      opacity: uploadloader ? 0.5 : 1,
                    }}
                    onClick={() => {
                      if (!uploadloader) setassemblyModal(true);
                    }}
                  >
                    View Data
                  </span>
                </h4>
              </div>
            )}

            <div className="p-3 d-flex">
              {/* Hide these buttons if uploading */}
              {!uploadloader && (
                <>
                  <div
                    className="border rounded-2 bg-primary-light d-flex p-2 me-3 cursor-pointer"
                    onClick={() => handleUploadClick("upload")}
                  >
                    <Image
                      src={"/inventorymanagement/upload-file.png"}
                      height={15}
                      width={15}
                      alt="upload-file"
                    />
                    <h4 className="font-14 fw-bold text-primary m-0 ms-2">
                      Upload File
                    </h4>
                  </div>
                  <div
                    className="border rounded-2 bg-primary-light d-flex p-2 cursor-pointer"
                    onClick={() => handleUploadClick("photo")}
                  >
                    <Image
                      src={"/inventorymanagement/take-photo.png"}
                      height={15}
                      width={15}
                      alt="upload-file"
                    />
                    <h4 className="font-14 fw-bold text-primary m-0 ms-2">
                      Take Photo
                    </h4>
                  </div>
                </>
              )}

              {/* Show Loader if uploading */}
              {uploadloader && (
                <div className="d-flex px-3">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <h4 className="font-16 fw-bold">File uploading...</h4>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept="image/*"
                multiple
                // capture="environment"
                onChange={(e) => {
                  e.target.files ? handleMultipleUpload(e.target.files) : "";
                }}
              />
            </div>

            {isUploadsuccess && !uploadloader && (
              <div className="d-flex px-3">
                <Image
                  src={"/inventorymanagement/green-tick.svg"}
                  height={16}
                  width={16}
                  alt="green-tick"
                  className="me-1"
                />
                <h4 className="font-16 fw-bold">Successfully Uploaded</h4>
              </div>
            )}
          </div>
        </Col>
      </Row>
      <Row className="">
        <h5 className="font-24 fw-bold mt-3">Configuration</h5>
        <Col>
          <div className="bg-gray-light rounded-2 border">
            <div className="border-bottom p-3">
              <h4 className="font-16 fw-bold">Delivery Days</h4>
              <div className="d-flex flex-wrap">
                {deliveryDates?.map((dates, index) => (
                  <Form.Select
                    key={index}
                    className="rb-custom-select me-2"
                    value={dates.day}
                    disabled={uploadloader}
                    onChange={(e) => {
                      const selectedDay = e.target.value as DeliveryDate["day"];

                      if (isDayAlreadyUsed(selectedDay, index)) {
                        alert(`${selectedDay} is already selected`);
                        return;
                      }

                      setDeliveryDates((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                day: selectedDay,
                                date: getComingWeekday(selectedDay),
                              }
                            : item
                        )
                      );
                    }}
                  >
                    <option value={"MON"}>Monday</option>
                    <option value={"TUE"}>Tuesday</option>
                    <option value={"WED"}>Wednesday</option>
                    <option value={"THU"}>Thursday</option>
                    <option value={"FRI"}>Friday</option>
                    <option value={"SAT"}>Saturday</option>
                    <option value={"SUN"}>Sunday</option>
                  </Form.Select>
                ))}
                <div
                  className="d-flex align-items-center justify-content-center border rounded-2 bg-white px-2"
                  style={{
                    pointerEvents: uploadloader ? "none" : "auto",
                    opacity: uploadloader ? 0.5 : 1,
                  }}
                  onClick={() => {
                    if (!uploadloader) {
                      setDeliveryDates((prev) => [
                        ...prev,
                        {
                          day: "MON",
                          date: getComingWeekday("MON"),
                          date_range: "",
                          custom_date_range: [],
                          days: [],
                        },
                      ]);
                    }
                  }}
                >
                  <Image
                    src={"/inventorymanagement/orange-plus.png"}
                    height={18}
                    width={18}
                    alt="orange-plus"
                  />
                </div>
              </div>
            </div>
            <div className="border-bottom p-3">
              <h4 className="font-16 fw-bold">Sales Data</h4>
              {deliveryDates?.map((dates, index) => (
                <div className="mb-3" key={index}>
                  <p className="font-13 fw-bold">
                    Sales Data for {getDayName(dates.date)} :
                    <span className="text-secondary fw-normal">
                      {" "}
                      {dates.custom_date_range.length > 0
                        ? dates.custom_date_range.length === 2
                          ? `${dates.custom_date_range[0]
                              .toDate()
                              .toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })} - ${dates.custom_date_range[1]
                              .toDate()
                              .toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}`
                          : ""
                        : formattedRange}
                    </span>
                  </p>
                  <div className="d-flex flex-wrap align-items-center">
                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                      (day) => (
                        <div className="d-flex me-3" key={day}>
                          <Form.Check
                            type="checkbox"
                            disabled={uploadloader}
                            id={`custom-check-${dates.day}-${day}`}
                            className="rb-orange-check"
                            checked={dates.days?.includes(day as DayCode)}
                            onChange={() =>
                              toggleDay(dates.day, day as DayCode)
                            }
                          />
                          <p className="font-13 m-0 ms-2">
                            {day.charAt(0) + day.slice(1).toLowerCase()}
                          </p>
                        </div>
                      )
                    )}

                    <DatePicker
                      range
                      value={dates.custom_date_range}
                      disabled={uploadloader}
                      onChange={(value) => {
                        setDeliveryDates((prev) =>
                          prev.map((item) =>
                            item.day === dates.day
                              ? {
                                  ...item,
                                  custom_date_range: value as DateObject[],
                                  days: [],
                                }
                              : item
                          )
                        );
                      }}
                      placeholder="Custom date"
                      format="DD MMM, YYYY"
                      maxDate={new DateObject().subtract(1, "day")}
                      render={(value, openCalendar) => (
                        <div
                          className="custom-date-input"
                          onClick={!uploadloader ? openCalendar : undefined}
                          style={{
                            cursor: uploadloader ? "not-allowed" : "pointer",
                            opacity: uploadloader ? 0.6 : 1,
                          }}
                        >
                          <input
                            type="text"
                            readOnly
                            value={value}
                            placeholder="Custom date"
                            disabled={uploadloader}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
      <Button
        className="btn-filled float-end mt-3 mb-5"
        disabled={uploadloader}
        onClick={() => {
          handleSaveConfig();
        }}
      >
        Next
      </Button>
      <Modal
        show={assemblyModal}
        onHide={() => {
          setassemblyModal(false);
        }}
        fullscreen
        backdrop="static"
      >
        <Modal.Header className="p-2">
          <Modal.Title className="font-14">Stock Data</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex align-items-center justify-content-between">
            <p className="font-24 fw-bold">
              {stockJson?.length} Assembly Items
            </p>
            <div>
              <Button
                className="btn-outline text-primary me-2 text-capitalize"
                onClick={() => {
                  setassemblyModal(false);
                }}
              >
                close
              </Button>
              <Button
                className="btn-filled text-capitalize"
                onClick={() => {
                  HandleUpdateAssembly();
                }}
              >
                save
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Datatable<AssemblyRow>
              columns={assemblyColumns}
              rowData={stockJson}
              progressPending={isLoading}
              pagination={true}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <div>
            <Button
              className="btn-outline text-primary me-2 text-capitalize"
              onClick={() => {
                setassemblyModal(false);
              }}
            >
              close
            </Button>
            <Button
              className="btn-filled text-capitalize"
              onClick={() => {
                HandleUpdateAssembly();
              }}
            >
              save
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
