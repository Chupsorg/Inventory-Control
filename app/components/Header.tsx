import Image from 'next/image'
import React from 'react'

export default function Header() {
  return (
    <div>
      <div className='d-flex align-items-center p-3 border-bottom'>
        <Image src={"/ham-icon.svg"} width={20} height={20} alt='ham-icon' className='me-3'/>
        <h3 className='m-0 font-13'>Inventory Management</h3>
      </div>
    </div>
  )
}
 