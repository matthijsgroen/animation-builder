import React from "react";
import styled from "styled-components";

const MenuContainer = styled.aside`
  flex: 0 0 250px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const MainContainer = styled.div`
  flex: 1 1 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Canvas = styled.div`
  flex: 1 1 100%;
  height: 100%;
`;

const ToolBar = styled.div`
  flex: 0;
  background-color: ${({ theme }) => theme.colors.backgroundSecondary};
  padding: 0.2rem;
  display: flex;
  flex-direction: row;
`;

const hasItems = (tools?: React.ReactElement | React.ReactElement[]): boolean =>
  !!tools && ("length" in tools ? tools.length > 0 : true);

interface ScreenLayoutProps {
  menus?: React.ReactElement | React.ReactElement[];
  tools?: React.ReactElement | React.ReactElement[];
  main?: React.ReactElement;
}

const ScreenLayout: React.FC<ScreenLayoutProps> = ({ menus, tools, main }) => (
  <>
    {hasItems(menus) && <MenuContainer>{menus}</MenuContainer>}
    <MainContainer>
      {hasItems(tools) && <ToolBar>{tools}</ToolBar>}
      <Canvas>{main}</Canvas>
    </MainContainer>
  </>
);

export default ScreenLayout;
