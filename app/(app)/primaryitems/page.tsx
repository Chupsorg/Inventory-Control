"use client"
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { useCallApiMutation } from '@/app/store/services/apiSlice';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Button, Form, Modal } from 'react-bootstrap';
import Image from 'next/image';
import { TableColumn } from 'react-data-table-component';
import Datatable from '@/app/components/Datatable';
import { getDayName, formatDate } from '@/app/utils/properties';
import { toggleItem, updateItemQty, setPrimaryItems, selectAllInGroup, bulkUpdateRcomQty } from "@/app/store/features/primaryItemsSlice";

type OrderRow = {
  id: number;
  itemName: string;
  mainItemName: string;
  itemQty: number;
  rcomQty: number;
  UOM: string;
  itemMeasQty: string,
  itemMeasDesc: string,
  groupIndex: number,
  checked: boolean
};

export default function page() {
  const [callApi, { isLoading }] = useCallApiMutation();
  const router = useRouter();
  const dispatch = useDispatch();
  const config = useSelector(
    (state: RootState) => state.config.config
  );
  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );
  const { list: primaryItemList, isFetched } = useSelector(
    (state: RootState) => state.primaryItems
  );

  const [filterModal, setfilterModal] = useState(false);

  const [filterType, setFilterType] = useState<"online" | "event">("event");
  const [operator, setOperator] = useState<"+" | "-">("+");
  const [percentage, setPercentage] = useState<number>(0);
  const getColumns = (groupIndex: number): TableColumn<OrderRow>[] => [
    {
      name: <Form.Check
        type="checkbox"
        className="rb-orange-check"
        checked={isAllSelected(groupIndex)}
        onChange={(e) =>
          dispatch(
            selectAllInGroup({
              groupIndex,
              checked: e.target.checked,
            })
          )
        }
      />,
      selector: row => row.checked,
      width: '60px',
      cell: row => (
        <Form.Check
          type="checkbox"
          className="rb-orange-check"
          checked={row.checked}
          onChange={() =>
            dispatch(toggleItem({ groupIndex, itemId: row.id }))
          }
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
      name: 'event',
      selector: row => row.mainItemName,
      sortable: true,
      center: true
    },
    {
      name: 'Actual Orders',
      selector: row => row.itemQty,
      sortable: true,
      center: true
    },
    {
      name: 'Recommented Orders',
      selector: row => row.rcomQty,
      sortable: true,
      center: true,
      cell: row => (
        <Form.Control
          type="number"
          className={`text-center ${row.itemQty < row.rcomQty ? "green-border" : row.itemQty > row.rcomQty ? "red-border" : ""}`}
          value={row.rcomQty}
          onChange={(e) =>
            dispatch(
              updateItemQty({
                groupIndex,
                itemId: row.id,
                qty: Number(e.target.value),
              })
            )
          }
        />
      ),
    },
    {
      name: 'UOM',
      width: '100px',
      center: true,
      cell: row => (
        <span>
          {`${row?.itemMeasQty}${row?.itemMeasDesc}`}
        </span>
      ),
    }
  ];
  const isAllSelected = (groupIndex: number) => {
    const items = primaryItemList[groupIndex]?.items || [];
    return items.length > 0 && items.every((item: any) => item.checked);
  };

  const buildPrimaryItemPayload = (cfg: any) => {
    return {
      cloud_kitchen_id: loginDetails?.cloudKitchenId,
      delivery_date: new Date(cfg.date).toISOString().split("T")[0],
      sale_days: cfg.days,
      previous_week_count: 1,
      sale_dates: cfg.custom_date_range
    };
  };
  useEffect(() => {
    if (!loginDetails || !config?.length) return;
    if (isFetched) return;
    const fetchAll = async () => {
      try {
        const responses = await Promise.all(
          config.map((cfg: any) =>
            callApi({
              url: "StoreCtl/get-inventory-primary-items-list",
              body: buildPrimaryItemPayload(cfg),
            }).unwrap()
          )
        );

        const result = responses.map((res, index) => ({
          config: config[index],
          items: res.object.map((itm: any, i: number) => ({
            ...itm,
            id: i + 1,
            checked: false,
            rcomQty: itm.itemQty
          })),
        }));

        dispatch(setPrimaryItems(result));
      } catch (err) {
        console.error(err);
      }
    };

    fetchAll();
  }, [config]);



  return (
    <Container fluid className='p-4'>
      <Row>
        <Col><Image src={"back-icon.svg"} height={24} width={24} alt={"backicon"} onClick={() => { router.back() }} /></Col>
        <Col className='d-flex align-items-center justify-content-end'>
          <div className='border p-1 me-3'>
            <Image src={"filter-icon.svg"} height={18} width={18} alt="filter" onClick={() => { setfilterModal(true) }} />
          </div>
          <Button className="btn-filled" onClick={() => { router.push("/cart") }}>Next</Button>
        </Col>
      </Row>
      <Row className="flex-nowrap overflow-auto">
        {primaryItemList?.map((con, groupIndex) => {
          const orderRows: OrderRow[] = con.items.map(
            (item: any, index: number) => ({
              id: item.id,
              itemName: item.itemName,
              mainItemName: item.mainItemName,
              itemQty: item.itemQty,
              rcomQty: item.rcomQty,
              UOM: item.UOM,
              itemMeasQty: item.itemMeasQty,
              itemMeasDesc: item.itemMeasDesc,
              groupIndex,
              checked: item.checked ?? true,
            })
          );

          return (
            <Col xs={12} md={6} key={groupIndex}>
              <div>
                <h4 className='font-16 text-secondary fw-bold m-0'>{getDayName(new Date(con.config.date))} Delivery ({con.items.length} Items)</h4>
                <p className='m-0 font-13'>{formatDate(con.config.date)}</p>
              </div>

              <Datatable<OrderRow>
                columns={getColumns(groupIndex)}
                rowData={orderRows}
              />
            </Col>
          );
        })}

      </Row>
      <Modal show={filterModal} onHide={() => { setfilterModal(false) }} centered>
        <Modal.Header className="border-0">
          <Modal.Title className='font-18 fw-bold'>Filter</Modal.Title>
        </Modal.Header>
        <Modal.Body className='border-0'>
          <Row>
            <div className="d-flex mb-3">
              <Form.Check type="radio" name="filterType" id="online" label="Online" className="me-4 fw-bold" checked={filterType === "online"} onChange={() => setFilterType("online")} />
              <Form.Check type="radio" name="filterType" id="event" label="Event" className="fw-bold" checked={filterType === "event"} onChange={() => setFilterType("event")} />
            </div>
          </Row>
          <Form.Select className='mb-3'>
            <option></option>
          </Form.Select>
          <Form.Select className='mb-3'>
            <option>Veg, Non Veg</option>
          </Form.Select>
          <div className="filter-segment">
            <div className="segment">
              <Form.Select
                className="segment-select"
                value={operator}
                onChange={(e) => setOperator(e.target.value as "+" | "-")}
              >
                <option value="+">+</option>
                <option value="-">-</option>
              </Form.Select>
            </div>

            <div className="segment">
              <Form.Control
                type="number"
                className="segment-input"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
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
          <Button className="btn-filled" onClick={() => {
            if (!percentage) return;

            dispatch(
              bulkUpdateRcomQty({
                filterType,
                operator,
                percentage,
              })
            );

            setfilterModal(false);
          }}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
