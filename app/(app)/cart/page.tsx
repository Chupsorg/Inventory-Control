"use client"
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { useCallApiMutation } from '@/app/store/services/apiSlice';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Button, Form, Dropdown, Modal } from 'react-bootstrap';
import Image from 'next/image';
import { TableColumn } from 'react-data-table-component';
import Datatable from '@/app/components/Datatable';
import { getDayName, formatDate } from '@/app/utils/properties';

type OrderRow = {
  id: number;
  itemName: string;
  availableQty: number;
  recommendedQty: number;
  reqQty: number;
  storageType: string;
  uom: string;
  groupIndex: number,
  checked: boolean
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
        name: <Form.Check
          type="checkbox"
          className="rb-orange-check"
          checked={!!allChecked}
          onChange={(e) => {
            const checked = e.target.checked;
            setcartItem(prev =>
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
        />,
        width: '60px',
        sortable: true,
        cell: row => (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={row.checked}
            onChange={() => {
              setcartItem(prev =>
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
        )
      },
      {
        name: '#',
        selector: row => row.id,
        width: '60px',
        sortable: true,
      },
      {
        name: 'Item',
        selector: row => row.itemName,
        sortable: true,
      },
      {
        name: 'Fridge/Freezer',
        selector: row => row.storageType,
        sortable: true,
        center: true
      },
      {
        name: 'Available Qty',
        selector: row => row.availableQty,
        sortable: true,
        center: true
      },
      {
        name: 'Recommended Qty',
        selector: row => row.recommendedQty,
        sortable: true,
        center: true
      },
      {
        name: 'Required Qty',
        selector: row => row.reqQty,
        sortable: true,
        cell: row => (
          <Form.Control
            type="number"
            className='text-center'
            value={row.reqQty}
            onChange={(e) => {
              const qty = Math.max(0, Number(e.target.value));
              setcartItem(prev =>
                prev.map((grp, i) =>
                  i === groupIndex
                    ? {
                      ...grp,
                      items: grp.items.map((itm: any) =>
                        itm.id === row.id
                          ? { ...itm, reqQty: qty }
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
        name: 'UOM',
        width: '100px',
        selector: row => row.uom,
        cell: row => row.uom,
        center: true
      },
      {
        name: 'More',
        width: '100px',
        cell: row => <div>
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 more-toggle"
            >
              <Image src={"more-icon.svg"} height={24} width={24} alt='more-icon' />
            </Dropdown.Toggle>

            <Dropdown.Menu className="more-menu" renderOnMount popperConfig={{ strategy: 'fixed' }}>
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
              <Dropdown.Item className="text-danger" onClick={() => handleRowDelete(groupIndex, row.id)}>
                Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>,
        center: true
      }
    ]
  };

  const buildPrimaryItemPayload = (items: any) => {
    let array: { qty: string; meas_qty: string; item_code: string; meas_code: string; }[] = []
    items?.map((itm: any) => {
      array.push({
        qty: itm.rcomQty,
        meas_qty: itm.itemMeasQty,
        item_code: itm.itemCode,
        meas_code: itm.itemMeasCode
      })
    })
    return array
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
            reqQty: Math.max(
              0,
              itm.recommendedQty - itm.availableQty
            )
          })),
        }));
        setcartItem(result)
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

  const handleHeaderDelete = (groupIndex: number) => {
    const hasSelected = cartItem[groupIndex]?.items?.some(
      (itm: any) => itm.checked
    );

    if (!hasSelected) {
      alert("Please select item(s)");
      return;
    }

    setcartItem(prev =>
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
  const handleRowDelete = (groupIndex: number, rowId: number) => {
    setcartItem(prev =>
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

    setcartItem(prev => {
      const updated = [...prev];

      updated[fromGroupIndex] = {
        ...updated[fromGroupIndex],
        items: updated[fromGroupIndex].items.filter(
          (itm: any) => itm.id !== row.id
        ),
      };

      updated[toGroupIndex] = {
        ...updated[toGroupIndex],
        items: [
          ...updated[toGroupIndex].items,
          { ...row, checked: false },
        ],
      };

      return updated;
    });
  };
  const handleApplyFilter = () => {
    if (activeGroupIndex === null) return;

    setcartItem(prev =>
      prev.map((grp, gIndex) => {
        if (gIndex !== activeGroupIndex) return grp;

        return {
          ...grp,
          items: grp.items.map((itm: any) => {
            if (itm.storageType?.toLowerCase() !== filterType?.toLowerCase()) return itm;

            const percentage = Number(filterValue) || 0;
            const delta = (itm.reqQty * percentage) / 100;

            let updatedQty =
              filterAddOrSub === "+"
                ? itm.reqQty + delta
                : itm.reqQty - delta;

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

    setcartItem(prev =>
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
    <Container fluid className='p-4'>
      <Row className='mb-3'>
        <Col className='d-flex align-items-center'>
          <Image src={"back-icon.svg"} height={24} width={24} alt={"backicon"} onClick={() => { router.back() }} />
          <h3 className='font-24 fw-bold m-0 ms-3'>Recommended Cart Items</h3>
        </Col>
        <Col className='d-flex align-items-center justify-content-end'>
          {/* <div className='border p-1 me-3'>
          <Image src={"filter-icon.svg"} height={18} width={18} alt="filter"/>
        </div> */}
          <Button className="btn-filled" onClick={() => { router.push("/cart") }}>Send to Pantry</Button>
        </Col>
      </Row>
      <Row className="flex-nowrap overflow-auto">
        {cartItem?.map((cart, groupIndex) => (
          <Col xs={12} md={6} key={groupIndex}>
            <div>
              <div className='d-flex align-items-center justify-content-between bg-gray-light p-3 border'>
                <div>
                  <h4 className='font-16 text-secondary fw-bold m-0'>{getDayName(new Date(cart.config.date))} Delivery ({cart.items.length} Items)</h4>
                  <p className='m-0 font-13'>{formatDate(cart.config.date)}</p>
                </div>
                <div className='d-flex'>
                  <div className='border rounded-2 p-2 me-1 bg-white'><Image src={"move-icon.svg"} height={18} width={18} alt='move' /></div>
                  <div className='border rounded-2 p-2 me-1 bg-white' onClick={() => { handleHeaderDelete(groupIndex) }}><Image src={"delete-icon.svg"} height={18} width={18} alt='del' /></div>
                  <div className='border rounded-2 p-2 me-1 bg-white' onClick={() => { setActiveGroupIndex(groupIndex); setfilterModal(true); }}><Image src={"filter-icon.svg"} height={18} width={18} alt='filter' /></div>
                  <div className='border rounded-2 p-2 bg-white' onClick={() => {
                    setActiveGroupIndex(groupIndex);
                    setSelectedItem(null);
                    setSelectedUom(null);
                    setnewItemModal(true);
                  }}><Image src={"/orange-plus.png"} height={18} width={18} alt='plus' /></div>
                </div>
              </div>
              <Datatable<OrderRow>
                columns={getColumns(groupIndex)}
                rowData={cart?.items}
              />
            </div>
          </Col>
        ))}
      </Row>
      <Modal show={filterModal} onHide={() => { setfilterModal(false) }} centered>
        <Modal.Header className="border-0">
          <Modal.Title className='font-18 fw-bold'>Filter</Modal.Title>
        </Modal.Header>
        <Modal.Body className='border-0'>

          <Form.Select className='mb-3' value={filterType} onChange={(e) => setfilterType(e.target.value)}>
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

            <div className="segment percent">
              %
            </div>
          </div>

        </Modal.Body>
        <Modal.Footer className='border-0'>
          <Button className="btn-outline px-4" onClick={() => { setfilterModal(false) }}>
            Cancel
          </Button>
          <Button className="btn-filled" onClick={handleApplyFilter}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={newItemModal} onHide={() => { setnewItemModal(false) }} centered>
        <Modal.Header className="border-0">
          <Modal.Title className='font-18 fw-bold'>Add New Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body className='border-0'>
          <Form.Select className='mb-3' value={selectedItem?.itemCode || ""}
            onChange={(e) => {
              const item = itemList.find(
                (i: any) => i.itemCode === Number(e.target.value)
              );
              setSelectedItem(item);
              setSelectedUom(null);
            }}>
            <option value={""}>Select Item</option>
            {itemList?.map((itm: any) => (
              <option key={itm.itemCode} value={itm.itemCode}>
                {itm.itemName}
              </option>
            ))}
          </Form.Select>
          <Form.Select className='mb-3' value={selectedUom?.measCode || ""}
            onChange={(e) => {
              const uom = selectedItem.uom_list.find(
                (u: any) => u.measCode === Number(e.target.value)
              );
              setSelectedUom(uom);
            }}>
            <option value={""}>Select UOM</option>
            {selectedItem?.uom_list?.map((u: any) => (
              <option key={u.measCode} value={u.measCode}>
                {u.qty} {u.uom}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer className='border-0'>
          <Button className="btn-outline px-4" onClick={() => { setfilterModal(false) }}>
            Cancel
          </Button>
          <Button className="btn-filled" onClick={handleAddNewItem}>
            Add
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
