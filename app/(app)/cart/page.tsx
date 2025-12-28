"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useRouter } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Dropdown,
  Modal,
} from "react-bootstrap";
import Image from "next/image";
import { TableColumn } from "react-data-table-component";
import Datatable from "@/app/components/Datatable";
import { getDayName, formatDate } from "@/app/utils/properties";
import moment from "moment";

type OrderRow = {
  id: number;
  itemName: string;
  availableQty: number;
  recommendedQty: number;
  reqQty: number;
  storageType: string;
  uom: string;
  groupIndex: number;
  checked: boolean;
};

export default function page() {
  const [callApi, { isLoading }] = useCallApiMutation();
  const router = useRouter();
  const dispatch = useDispatch();
  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );
  const { list: primaryItemList, isFetched } = useSelector(
    (state: RootState) => state.primaryItems
  );
  const [cartItem, setcartItem] = useState<any[]>([]);

  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

  const [filterModal, setfilterModal] = useState(false);
  const [filterType, setfilterType] = useState("Fridge");
  const [filterAddOrSub, setfilterAddOrSub] = useState("+");
  const [filterValue, setfilterValue] = useState<number>(0);

  const [itemList, setitemList] = useState<any[]>([]);
  const [newItemModal, setnewItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedUom, setSelectedUom] = useState<any>(null);

  const getColumns = (groupIndex: number): TableColumn<OrderRow>[] => {
    const allChecked = cartItem[groupIndex]?.items?.every(
      (i: any) => i.checked
    );

    return [
      {
        name: (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={!!allChecked}
            onChange={(e) => {
              const checked = e.target.checked;
              setcartItem((prev) =>
                prev.map((grp, i) =>
                  i === groupIndex
                    ? {
                        ...grp,
                        items: grp.items.map((itm: any) => ({
                          ...itm,
                          checked,
                        })),
                      }
                    : grp
                )
              );
            }}
          />
        ),
        width: "60px",
        sortable: true,
        cell: (row) => (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={row.checked}
            onChange={() => {
              setcartItem((prev) =>
                prev.map((grp, i) =>
                  i === groupIndex
                    ? {
                        ...grp,
                        items: grp.items.map((itm: any) =>
                          itm.id === row.id
                            ? { ...itm, checked: !itm.checked }
                            : itm
                        ),
                      }
                    : grp
                )
              );
            }}
          />
        ),
      },
      {
        name: "#",
        selector: (row) => row.id,
        width: "60px",
        sortable: true,
      },
      {
        name: "Item",
        selector: (row) => row.itemName,
        sortable: true,
      },
      {
        name: "Fridge/Freezer",
        selector: (row) => row.storageType,
        sortable: true,
        center: true,
      },
      {
        name: "Available Qty",
        selector: (row) => row.availableQty,
        sortable: true,
        center: true,
      },
      {
        name: "Recommended Qty",
        selector: (row) => row.recommendedQty,
        sortable: true,
        center: true,
      },
      {
        name: "Required Qty",
        selector: (row) => row.reqQty,
        sortable: true,
        cell: (row) => (
          <Form.Control
            type="number"
            className="text-center"
            value={row.reqQty}
            onChange={(e) => {
              const qty = Math.max(0, Number(e.target.value));
              setcartItem((prev) =>
                prev.map((grp, i) =>
                  i === groupIndex
                    ? {
                        ...grp,
                        items: grp.items.map((itm: any) =>
                          itm.id === row.id ? { ...itm, reqQty: qty } : itm
                        ),
                      }
                    : grp
                )
              );
            }}
          />
        ),
      },
      {
        name: "UOM",
        width: "100px",
        selector: (row) => row.uom,
        cell: (row) => row.uom,
        center: true,
      },
      {
        name: "More",
        width: "100px",
        cell: (row) => (
          <div>
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="link"
                className="p-0 border-0 more-toggle"
              >
                <Image
                  src={"/inventorymanagementmore-icon.svg"}
                  height={24}
                  width={24}
                  alt="more-icon"
                />
              </Dropdown.Toggle>

              <Dropdown.Menu
                className="more-menu"
                renderOnMount
                popperConfig={{ strategy: "fixed" }}
              >
                {/* <Dropdown.Item> Edit </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item> Split </Dropdown.Item>
              <Dropdown.Divider /> */}
                {cartItem.map((grp, targetIndex) => {
                  if (targetIndex === groupIndex) return null;

                  return (
                    <Dropdown.Item
                      key={targetIndex}
                      onClick={() =>
                        handleMoveItem(groupIndex, targetIndex, row)
                      }
                    >
                      Move to {getDayName(new Date(grp.config.date))} delivery
                    </Dropdown.Item>
                  );
                })}

                <Dropdown.Divider />
                <Dropdown.Item
                  className="text-danger"
                  onClick={() => handleRowDelete(groupIndex, row.id)}
                >
                  Delete
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        ),
        center: true,
      },
    ];
  };

  const buildPrimaryItemPayload = (items: any) => {
    let array: {
      qty: string;
      meas_qty: string;
      item_code: string;
      meas_code: string;
    }[] = [];
    items?.map((itm: any) => {
      array.push({
        qty: itm.rcomQty,
        meas_qty: itm.itemMeasQty,
        item_code: itm.itemCode,
        meas_code: itm.itemMeasCode,
      });
    });
    return array;
  };
  useEffect(() => {
    if (!loginDetails || !primaryItemList?.length) return;
    const fetchAll = async () => {
      try {
        const responses = await Promise.all(
          primaryItemList.map((cfg: any) =>
            callApi({
              url: `StoreCtl/get-inventory-assembly-items-list/${loginDetails?.cloudKitchenId} `,
              body: buildPrimaryItemPayload(cfg.items),
            }).unwrap()
          )
        );

        const result = responses.map((res, index) => ({
          config: primaryItemList[index].config,
          items: res.object.map((itm: any, i: number) => ({
            ...itm,
            id: i + 1,
            checked: false,
            reqQty:
              itm.recommendedQty > itm.availableQty
                ? Math.max(0, itm.maxQty - itm.availableQty)
                : Math.max(0, itm.recommendedQty - itm.availableQty),
          })),
        }));
        setcartItem(result);
      } catch (err) {
        console.error(err);
      }
      try {
        const res = await callApi({
          url: `StoreCtl/get-kitchen-assembly-items-list/${loginDetails?.cloudKitchenId}`,
        }).unwrap();

        if (res?.status) {
          setitemList(res.object || []);
        }
      } catch (error) {
        console.error("Failed to fetch item list", error);
      }
    };

    fetchAll();
  }, [loginDetails, primaryItemList]);

  const buildPlaceOrderPayload = (cartItem: any) => {
    console.log(loginDetails);
    console.log(cartItem.config);
    const reqBody = {
      cloudKitchenId: 1,
      name: loginDetails?.userName,
      mobile: "",
      delDate: moment(cartItem.config.date).format("YYYY-MM-DD") + " 00:00:00",
      couponId: 0,
      delType: "ID",
      storeType: "R",
      pointCheck: "N",
      usedPointsAmt: "",
      pointsAmt: "",
      taxPercentage: 0,
      modeOfOrder: "W",
      paymentRequired: "N",
      subTotal: 0,
      tax: 0,
      discountAmt: 0,
      couponDiscountAmt: 0,
      tips: 0,
      totalOrderAmount: 0,
      pendingPayment: "Y",
      entityType: "INTERNAL",
      kitchenLocationId: 0,
      itemList: buildPlaceOrderItemsPayload(cartItem, false),
      partnerLocation: loginDetails?.cloudKitchenName,
      partnerKitchenId: loginDetails?.cloudKitchenId,
      partnerItemDeliveryList: buildPlaceOrderItemsPayload(cartItem, true),
    };
    console.log("Place Order Payload: ", reqBody);
    return reqBody;
  };
  const buildPlaceOrderItemsPayload = (
    cartItem: any,
    isPartnerItemDeliveryList?: boolean
  ) => {
    const array: {
      menuId: number;
      cgyId: number;
      itemCode: number;
      itemType: string;
      quantity: number;
      remarks: string;
      listMeasurements: Array<{
        qty: number;
        measurementCode: number;
        measurementDesc: string;
        rate: number;
      }>;
    }[] = [];
    const array1: {
      menuId: number;
      cgyId: number;
      itemCode: number;
      itemType: string;
      quantity: number;
      remarks: string;
      listMeasurements: Array<{
        qty: number;
        measurementCode: number;
        measurementDesc: string;
        rate: number;
      }>;
      itemDelDate: string;
    }[] = [];
    cartItem?.items?.map((itm: any) => {
      array.push({
        menuId: 0,
        cgyId: 0,
        itemCode: itm.itemCode,
        itemType: itm.itemType,
        quantity: itm.reqQty,
        remarks: "",
        listMeasurements: [
          {
            measurementDesc: itm.uom,
            measurementCode: itm.measCode,
            qty: 1,
            rate: 0,
          },
        ],
      });
      array1.push({
        menuId: 0,
        cgyId: 0,
        itemCode: itm.itemCode,
        itemType: itm.itemType,
        quantity: itm.reqQty,
        remarks: "",
        listMeasurements: [
          {
            measurementDesc: itm.uom,
            measurementCode: itm.measCode,
            qty: 1,
            rate: 0,
          },
        ],
        itemDelDate: moment(cartItem.config.date).format("YYYY-MM-DD"),
      });
    });
    return isPartnerItemDeliveryList ? array1 : array;
  };
  const handlePlaceOrder = async () => {
    if (!loginDetails || !cartItem?.length) return;
    cartItem.forEach(async (cItem: any) => {
      console.log(buildPlaceOrderPayload(cItem));
      try {
        const res = await callApi({
          url: "OrderCtl/place_partner_order",
          body: buildPlaceOrderPayload(cItem),
        }).unwrap();

        if (res?.status) {
          alert(
            `Order for ${getDayName(
              new Date(cItem.config.date)
            )} placed successfully!`
          );
          if (cartItem.indexOf(cItem) === cartItem.length - 1) {
            router.push("/orders");
          }
        } else {
          alert(
            `Failed to place order for ${getDayName(
              new Date(cItem.config.date)
            )}`
          );
        }
      } catch (error) {
        console.error("Failed to place order", error);
        alert(
          `Error placing order for ${getDayName(new Date(cItem.config.date))}`
        );
      }
    });
  };

  const handleHeaderDelete = (groupIndex: number) => {
    const hasSelected = cartItem[groupIndex]?.items?.some(
      (itm: any) => itm.checked
    );

    if (!hasSelected) {
      alert("Please select item(s)");
      return;
    }

    setcartItem((prev) =>
      prev.map((grp, i) =>
        i === groupIndex
          ? {
              ...grp,
              items: grp.items.filter((itm: any) => !itm.checked),
            }
          : grp
      )
    );
  };

  const handleBulkMoveToNext = (currentIndex: number) => {
    // if (currentIndex >= cartItem.length - 1) {
    //   alert("No next delivery available to move items to.");
    //   return;
    // }

    const currentGroup = cartItem[currentIndex];
    const itemsToMove = currentGroup.items.filter((item: any) => item.checked);

    if (itemsToMove.length === 0) {
      alert("Please select items to move.");
      return;
    }

    setcartItem((prev) => {
      const newState = [...prev];

      // 1. Remove items from current group
      newState[currentIndex] = {
        ...newState[currentIndex],
        items: newState[currentIndex].items.filter(
          (item: any) => !item.checked
        ),
      };

      // Determine destination index
      const targetIndex =
        currentIndex >= cartItem.length - 1
          ? currentIndex - 1
          : currentIndex + 1;

      const destinationGroup = newState[targetIndex];
      const destinationItems = destinationGroup.items;

      // Get the date from the destination group's config
      const targetDate = destinationGroup.config.date;

      const maxId =
        destinationItems.length > 0
          ? Math.max(...destinationItems.map((i: any) => i.id))
          : 0;

      // 2. Add items to destination group with UPDATED DATE
      const itemsToAdd = itemsToMove.map((item: any, index: number) => ({
        ...item,
        checked: false,
        id: maxId + 1 + index,
        // Explicitly update the item's date to match the new group's config date
        itemDelDate: moment(targetDate).format("YYYY-MM-DD"),
      }));

      newState[targetIndex] = {
        ...newState[targetIndex],
        items: [...destinationItems, ...itemsToAdd],
      };

      return newState;
    });
  };
  const handleRowDelete = (groupIndex: number, rowId: number) => {
    setcartItem((prev) =>
      prev.map((grp, i) =>
        i === groupIndex
          ? {
              ...grp,
              items: grp.items.filter((itm: any) => itm.id !== rowId),
            }
          : grp
      )
    );
  };
  const handleMoveItem = (
    fromGroupIndex: number,
    toGroupIndex: number,
    row: OrderRow
  ) => {
    if (fromGroupIndex === toGroupIndex) return;

    setcartItem((prev) => {
      const updated = [...prev];

      // 1. Remove from source
      updated[fromGroupIndex] = {
        ...updated[fromGroupIndex],
        items: updated[fromGroupIndex].items.filter(
          (itm: any) => itm.id !== row.id
        ),
      };

      // Get the date from the destination group
      const targetDate = updated[toGroupIndex].config.date;

      // 2. Add to destination with UPDATED DATE
      updated[toGroupIndex] = {
        ...updated[toGroupIndex],
        items: [
          ...updated[toGroupIndex].items,
          {
            ...row,
            checked: false,
            // Explicitly update the item's date property
            itemDelDate: moment(targetDate).format("YYYY-MM-DD"),
          },
        ],
      };

      return updated;
    });
  };
  const handleApplyFilter = () => {
    if (activeGroupIndex === null) return;

    setcartItem((prev) =>
      prev.map((grp, gIndex) => {
        if (gIndex !== activeGroupIndex) return grp;

        return {
          ...grp,
          items: grp.items.map((itm: any) => {
            if (itm.storageType?.toLowerCase() !== filterType?.toLowerCase())
              return itm;

            const percentage = Number(filterValue) || 0;
            const delta = (itm.reqQty * percentage) / 100;

            let updatedQty =
              filterAddOrSub === "+" ? itm.reqQty + delta : itm.reqQty - delta;

            return {
              ...itm,
              reqQty: Math.max(0, Math.round(updatedQty)),
            };
          }),
        };
      })
    );

    setfilterModal(false);
  };
  const handleAddNewItem = () => {
    if (!selectedItem && !selectedUom) {
      alert("Please select item and UOM");
      return;
    }

    if (!selectedItem) {
      alert("Please select item");
      return;
    }

    if (!selectedUom) {
      alert("Please select UOM");
      return;
    }

    if (activeGroupIndex === null) return;

    setcartItem((prev) =>
      prev.map((grp, gIndex) => {
        if (gIndex !== activeGroupIndex) return grp;

        const alreadyExists = grp.items.some(
          (itm: any) =>
            itm.itemCode === selectedItem.itemCode &&
            itm.measCode === selectedUom.measCode
        );

        if (alreadyExists) {
          alert("Item already exists in this delivery");
          return grp;
        }
        const nextId =
          grp.items.length > 0
            ? Math.max(...grp.items.map((i: any) => i.id)) + 1
            : 1;
        return {
          ...grp,
          items: [
            ...grp.items,
            {
              id: nextId,
              itemCode: selectedItem.itemCode,
              itemName: selectedItem.itemName,
              itemType: selectedItem.itemType,
              storageType: selectedItem.storageType,
              uom: selectedUom.uom,
              measCode: selectedUom.measCode,
              reqQty: 0,
              availableQty: 0,
              recommendedQty: 0,
              checked: false,
            },
          ],
        };
      })
    );

    setSelectedItem(null);
    setSelectedUom(null);
    setnewItemModal(false);
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-3">
        <Col className="d-flex align-items-center">
          <Image
            src={"/inventorymanagementback-icon.svg"}
            height={24}
            width={24}
            alt={"backicon"}
            onClick={() => {
              router.back();
            }}
          />
          <h3 className="font-24 fw-bold m-0 ms-3">Recommended Cart Items</h3>
        </Col>
        <Col className="d-flex align-items-center justify-content-end">
          {/* <div className='border p-1 me-3'>
          <Image src={"/inventorymanagementfilter-icon.svg"} height={18} width={18} alt="filter"/>
        </div> */}
          <Button className="btn-filled" onClick={() => handlePlaceOrder()}>
            Send to Pantry
          </Button>
        </Col>
      </Row>
      <Row className="flex-nowrap overflow-auto">
        {cartItem?.map((cart, groupIndex) => (
          <Col xs={12} md={6} key={groupIndex}>
            <div>
              <div className="d-flex align-items-center justify-content-between bg-gray-light p-3 border">
                <div>
                  <h4 className="font-16 text-secondary fw-bold m-0">
                    {getDayName(new Date(cart.config.date))} Delivery (
                    {cart.items.length} Items)
                  </h4>
                  <p className="m-0 font-13">{formatDate(cart.config.date)}</p>
                </div>
                <div className="d-flex">
                  <div
                    className="border rounded-2 p-2 me-1 bg-white"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleBulkMoveToNext(groupIndex)}
                  >
                    <Image
                      src={"/inventorymanagementmove-icon.svg"}
                      height={18}
                      width={18}
                      alt="move"
                    />
                  </div>
                  <div
                    className="border rounded-2 p-2 me-1 bg-white"
                    onClick={() => {
                      handleHeaderDelete(groupIndex);
                    }}
                  >
                    <Image
                      src={"/inventorymanagementdelete-icon.svg"}
                      height={18}
                      width={18}
                      alt="del"
                    />
                  </div>
                  <div
                    className="border rounded-2 p-2 me-1 bg-white"
                    onClick={() => {
                      setActiveGroupIndex(groupIndex);
                      setfilterModal(true);
                    }}
                  >
                    <Image
                      src={"/inventorymanagementfilter-icon.svg"}
                      height={18}
                      width={18}
                      alt="filter"
                    />
                  </div>
                  <div
                    className="border rounded-2 p-2 bg-white"
                    onClick={() => {
                      setActiveGroupIndex(groupIndex);
                      setSelectedItem(null);
                      setSelectedUom(null);
                      setnewItemModal(true);
                    }}
                  >
                    <Image
                      src={"/inventorymanagement/orange-plus.png"}
                      height={18}
                      width={18}
                      alt="plus"
                    />
                  </div>
                </div>
              </div>
              <Datatable<OrderRow>
                columns={getColumns(groupIndex)}
                rowData={cart?.items}
                progressPending={isLoading}
                pagination={true}
              />
            </div>
          </Col>
        ))}
      </Row>
      {/* Modals remain the same */}
      <Modal
        show={filterModal}
        onHide={() => {
          setfilterModal(false);
        }}
        centered
      >
        <Modal.Header className="border-0">
          <Modal.Title className="font-18 fw-bold">Filter</Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <Form.Select
            className="mb-3"
            value={filterType}
            onChange={(e) => setfilterType(e.target.value)}
          >
            <option value={"Fridge"}>Fridge</option>
            <option value={"Freezer"}>Freezer</option>
          </Form.Select>
          <div className="filter-segment">
            <div className="segment">
              <Form.Select
                className="segment-select"
                value={filterAddOrSub}
                onChange={(e) => setfilterAddOrSub(e.target.value)}
              >
                <option value="+">+</option>
                <option value="-">-</option>
              </Form.Select>
            </div>

            <div className="segment">
              <Form.Control
                type="number"
                className="segment-input"
                value={filterValue}
                onChange={(e) => setfilterValue(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            <div className="segment percent">%</div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            className="btn-outline px-4"
            onClick={() => {
              setfilterModal(false);
            }}
          >
            Cancel
          </Button>
          <Button className="btn-filled" onClick={handleApplyFilter}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={newItemModal}
        onHide={() => {
          setnewItemModal(false);
        }}
        centered
      >
        <Modal.Header className="border-0">
          <Modal.Title className="font-18 fw-bold">Add New Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <Form.Select
            className="mb-3"
            value={selectedItem?.itemCode || ""}
            onChange={(e) => {
              const item = itemList.find(
                (i: any) => i.itemCode === Number(e.target.value)
              );
              setSelectedItem(item);
              setSelectedUom(null);
            }}
          >
            <option value={""}>Select Item</option>
            {itemList?.map((itm: any) => (
              <option key={itm.itemCode} value={itm.itemCode}>
                {itm.itemName}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            className="mb-3"
            value={selectedUom?.measCode || ""}
            onChange={(e) => {
              const uom = selectedItem.uom_list.find(
                (u: any) => u.measCode === Number(e.target.value)
              );
              setSelectedUom(uom);
            }}
          >
            <option value={""}>Select UOM</option>
            {selectedItem?.uom_list?.map((u: any) => (
              <option key={u.measCode} value={u.measCode}>
                {u.qty} {u.uom}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            className="btn-outline px-4"
            onClick={() => {
              setfilterModal(false);
            }}
          >
            Cancel
          </Button>
          <Button className="btn-filled" onClick={handleAddNewItem}>
            Add
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
