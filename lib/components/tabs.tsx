import React, {forwardRef, useEffect, useState} from 'react';
import debounce from 'lodash/debounce';

import type {ITab, TabsProps} from '../../typings/hyper';
import {decorate, getTabProps} from '../utils/plugins';

import DropdownButton from './new-tab';
import Tab_ from './tab';

const Tab = decorate(Tab_, 'Tab');
const isMac = /Mac/.test(navigator.userAgent);

const Tabs = forwardRef<HTMLElement, TabsProps>((props, ref) => {
  const {tabs = [], borderColor, onChange, onClose, fullScreen} = props;

  const [shouldFocusCounter, setShouldFocusCounter] = useState({
    index: 0,
    when: undefined as (Date | undefined)
  });

  const scrollToActiveTab = debounce((tabs: ITab[]) => {
    const activeTab = tabs.findIndex(t => t.isActive);
    setShouldFocusCounter({
      index: activeTab,
      when: new Date()
    })
  }, 100);

  useEffect(() => {
    scrollToActiveTab(tabs)
  }, [tabs, tabs.length])

  const hide = !isMac && tabs.length === 1;

  return (
    <nav className={`tabs_nav ${hide ? 'tabs_hiddenNav' : ''}`} ref={ref}>
      {props.customChildrenBefore}
      {tabs.length === 1 && isMac ? <div className="tabs_title">{tabs[0].title}</div> : null}
      {tabs.length > 1 ? (
        <>
          <ul key="list" className={`tabs_list ${fullScreen && isMac ? 'tabs_fullScreen' : ''}`}>
            {tabs.map((tab, i) => {
              const {uid, title, isActive, hasActivity} = tab;
              const tabProps = getTabProps(tab, props, {
                text: title === '' ? 'Shell' : title,
                isFirst: i === 0,
                isLast: tabs.length - 1 === i,
                borderColor,
                isActive,
                hasActivity,
                onSelect: onChange.bind(null, uid),
                onClose: onClose.bind(null, uid),
                lastFocused: undefined as (Date | undefined),
              });
              if (shouldFocusCounter.index === i) {
                tabProps.lastFocused = shouldFocusCounter.when;
              }
              return <Tab key={`tab-${uid}`} {...tabProps} />;
            })}
          </ul>
          {isMac && (
            <div
              key="shim"
              style={{borderColor}}
              className={`tabs_borderShim ${fullScreen ? 'tabs_borderShimUndo' : ''}`}
            />
          )}
        </>
      ) : null}
      <DropdownButton {...props} tabsVisible={tabs.length > 1} />
      {props.customChildren}

      <style jsx>{`
        .tabs_nav {
          font-size: 12px;
          height: 34px;
          line-height: 34px;
          vertical-align: middle;
          color: #9b9b9b;
          cursor: default;
          position: relative;
          -webkit-user-select: none;
          -webkit-app-region: ${isMac ? 'drag' : ''};
          top: ${isMac ? '0px' : '34px'};
          display: flex;
          flex-flow: row;
        }

        .tabs_hiddenNav {
          display: none;
        }

        .tabs_title {
          text-align: center;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding-left: 76px;
          padding-right: 76px;
          flex-grow: 1;
        }

        .tabs_list {
          max-height: 34px;
          display: flex;
          flex-flow: row;
          margin-left: ${isMac ? '76px' : '0'};
          flex-grow: 1;
          overflow-x: auto;
        }

        .tabs_list::-webkit-scrollbar, .tabs_list::-webkit-scrollbar-button {
          display: none;
        }

        .tabs_fullScreen {
          margin-left: -1px;
        }

        .tabs_borderShim {
          position: absolute;
          width: 76px;
          bottom: 0;
          border-color: #ccc;
          border-bottom-style: solid;
          border-bottom-width: 1px;
        }

        .tabs_borderShimUndo {
          border-bottom-width: 0px;
        }
      `}</style>
    </nav>
  );
});

Tabs.displayName = 'Tabs';

export default Tabs;
