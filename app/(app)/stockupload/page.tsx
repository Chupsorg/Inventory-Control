"use client"
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Container, Row, Col, Modal, Button, Spinner, Form} from 'react-bootstrap'
import Image from 'next/image';
import { useCallApiMutation } from '@/app/store/services/apiSlice';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { TableColumn } from 'react-data-table-component';
import Datatable from '@/app/components/Datatable';

type AssemblyRow = {
  id: number;
  item: string;
  fridge_freeze: string;
  available_qty: number;
  uom: string;
  item_name: string;
};

export default function stockupload() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileList, setfileList] = useState<File[]>([]);
  const [stockDataId, setstockDataId] = useState(0);
  const [isUploadsuccess, setisUploadsuccess] = useState(false);
  const [stockJson, setstockJson] = useState<AssemblyRow[]>([]);
  const [assemblyModal, setassemblyModal] = useState<boolean>(false);
  
  useEffect(() => {
    const initData = async () => {
      if (!rehydrated || !loginDetails) return;
      // Fetch Stock
      try {
        const res = await callApi({
          url: `StoreCtl/get-inventory-data/STOCK/${loginDetails?.cloudKitchenId}`,
        }).unwrap();
        if (res.status) {
          const updatedRes = (res.object as any)?.[0]?.dataValue?.map(
            (data: any, i: number) => ({
              ...data,
              id: i + 1,
            })
          );
          setstockJson(updatedRes);
          setstockDataId((res.object as any)?.[0]?.dataId);
        } else {
          setstockJson([]);
        }
      } catch (error) {
        console.error("API error fetching stock", error);
      }
    };

    initData();
  }, [rehydrated, loginDetails, callApi]);

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
  // Reload stock specifically (used after upload/update)
  const reloadStock = async () => {
    try {
      const res = await callApi({
        url: `StoreCtl/get-inventory-data/STOCK/${loginDetails?.cloudKitchenId}`,
      }).unwrap();
      if (res.status) {
        const updatedRes = (res.object as any)?.[0]?.dataValue?.map(
          (data: any, i: number) => ({
            ...data,
            id: i + 1,
          })
        );
        setstockJson(updatedRes);
        setstockDataId((res.object as any)?.[0]?.dataId);
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

    setuploadloader(true);
    setisUploadsuccess(false);

    try {
      const res = await callApi({
        url: `StoreCtl/upload-stock-file/${loginDetails?.cloudKitchenId}`,
        body: formData as any,
      }).unwrap();

      if (res.status) {
        const callFetchStock = setInterval(async () => {
          const stock = await reloadStock();
          if (stock && stock.status) {
            setisUploadsuccess(true);
            setuploadloader(false);
            clearInterval(callFetchStock);
          }
        }, 5000);
      } else {
        console.log(res.message);
        setisUploadsuccess(false);
        setuploadloader(false);
      }
    } catch (err) {
      console.error("Upload failed", err);
      setuploadloader(false);
    }
  };
  const handleUpdateAssembly = async () => {
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
        body: params as any,
      }).unwrap();
      if (res.status) {
        setassemblyModal(false);
        reloadStock();
      } else {
        console.log(res.message);
      }
    } catch (err) {
      alert("error");
    }
  };
  return (
    <Container>
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
                    className={`ms-1 text-primary fw-bold ${uploadloader ? "" : "cursor-pointer"
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
            <div className='d-flex'>
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
                  handleUpdateAssembly();
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
                handleUpdateAssembly();
              }}
            >
              save
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
