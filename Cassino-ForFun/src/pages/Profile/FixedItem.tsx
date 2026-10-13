import React from 'react';
import Item from '../../components/Item';

interface FixedItemProps {
  fixedItem: any;
  isSameUser: boolean;
  setRefresh?: React.Dispatch<React.SetStateAction<boolean>>;
}

const FixedItem: React.FC<FixedItemProps> = ({ fixedItem, isSameUser, setRefresh }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-bold text-ink-soft uppercase">Fixed Item</span>
      <Item item={fixedItem} size="large" fixable={isSameUser} setRefresh={setRefresh} />
    </div>
  );
};

export default FixedItem;
