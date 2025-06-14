-- Stored Procedures for SistemaVacunacion Database
USE SistemaVacunacion;
GO

-- 1. Centros_Vacunacion
-- Create a new vaccination center
CREATE PROCEDURE sp_CrearCentroVacunacion
    @nombre_centro NVARCHAR(100),
    @nombre_corto NVARCHAR(50) = NULL,
    @direccion NVARCHAR(200) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @director NVARCHAR(100) = NULL,
    @sitio_web NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Centros_Vacunacion (
            nombre_centro, nombre_corto, direccion, latitud, longitud,
            telefono, director, sitio_web
        )
        VALUES (
            @nombre_centro, @nombre_corto, @direccion, @latitud, @longitud,
            @telefono, @director, @sitio_web
        );
        SELECT SCOPE_IDENTITY() AS id_centro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a vaccination center by ID
CREATE PROCEDURE sp_ObtenerCentroVacunacion
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Centros_Vacunacion WHERE id_centro = @id_centro;
END;
GO

-- Update a vaccination center
CREATE PROCEDURE sp_ActualizarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER,
    @nombre_centro NVARCHAR(100),
    @nombre_corto NVARCHAR(50) = NULL,
    @direccion NVARCHAR(200) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @director NVARCHAR(100) = NULL,
    @sitio_web NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Centros_Vacunacion
        SET
            nombre_centro = @nombre_centro,
            nombre_corto = @nombre_corto,
            direccion = @direccion,
            latitud = @latitud,
            longitud = @longitud,
            telefono = @telefono,
            director = @director,
            sitio_web = @sitio_web,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_centro = @id_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Centro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccination center (soft delete or check dependencies)
CREATE PROCEDURE sp_EliminarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Niños WHERE id_centro_salud = @id_centro
            UNION
            SELECT 1 FROM Lotes_Vacunas WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Personal_Salud WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Usuarios WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Campaña_Centro WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Citas WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Inventario_Suministros WHERE id_centro = @id_centro
        )
            RAISERROR ('No se puede eliminar el centro debido a registros dependientes', 16, 1);

        DELETE FROM Centros_Vacunacion WHERE id_centro = @id_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Centro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 2. Vacunas
-- Create a new vaccine
CREATE PROCEDURE sp_CrearVacuna
    @nombre_vacuna NVARCHAR(100),
    @fabricante NVARCHAR(100) = NULL,
    @tipo_vacuna NVARCHAR(50) = NULL,
    @descripcion NVARCHAR(500) = NULL,
    @dosis_totales_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Vacunas (
            nombre_vacuna, fabricante, tipo_vacuna, descripcion, dosis_totales_requeridas
        )
        VALUES (
            @nombre_vacuna, @fabricante, @tipo_vacuna, @descripcion, @dosis_totales_requeridas
        );
        SELECT SCOPE_IDENTITY() AS id_vacuna;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a vaccine by ID
CREATE PROCEDURE sp_ObtenerVacuna
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Vacunas WHERE id_vacuna = @id_vacuna;
END;
GO

-- Update a vaccine
CREATE PROCEDURE sp_ActualizarVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @nombre_vacuna NVARCHAR(100),
    @fabricante NVARCHAR(100) = NULL,
    @tipo_vacuna NVARCHAR(50) = NULL,
    @descripcion NVARCHAR(500) = NULL,
    @dosis_totales_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Vacunas
        SET
            nombre_vacuna = @nombre_vacuna,
            fabricante = @fabricante,
            tipo_vacuna = @tipo_vacuna,
            descripcion = @descripcion,
            dosis_totales_requeridas = @dosis_totales_requeridas,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_vacuna = @id_vacuna;
        IF @@ROWCOUNT = 0
            RAISERROR ('Vacuna no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccine
CREATE PROCEDURE sp_EliminarVacuna
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Lotes_Vacunas WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Campañas_Vacunacion WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Esquema_Vacunacion WHERE id_vacuna = @id_vacuna
        )
            RAISERROR ('No se puede eliminar la vacuna debido a registros dependientes', 16, 1);

        DELETE FROM Vacunas WHERE id_vacuna = @id_vacuna;
        IF @@ROWCOUNT = 0
            RAISERROR ('Vacuna no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 3. Niños
-- Create a new child
CREATE PROCEDURE sp_CrearNino
    @nombre_completo NVARCHAR(100),
    @identificacion NVARCHAR(50),
    @nacionalidad NVARCHAR(20),
    @pais_nacimiento NVARCHAR(50) = NULL,
    @fecha_nacimiento DATE,
    @genero CHAR(1),
    @direccion_residencia NVARCHAR(200) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @id_centro_salud UNIQUEIDENTIFIER = NULL,
    @contacto_principal NVARCHAR(20) = NULL,
    @id_salud_nacional NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Niños (
            nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento,
            genero, direccion_residencia, latitud, longitud, id_centro_salud,
            contacto_principal, id_salud_nacional
        )
        VALUES (
            @nombre_completo, @identificacion, @nacionalidad, @pais_nacimiento, @fecha_nacimiento,
            @genero, @direccion_residencia, @latitud, @longitud, @id_centro_salud,
            @contacto_principal, @id_salud_nacional
        );
        SELECT SCOPE_IDENTITY() AS id_niño;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a child by ID
CREATE PROCEDURE sp_ObtenerNino
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        n.*,
        c.nombre_centro
    FROM Niños n
    LEFT JOIN Centros_Vacunacion c ON n.id_centro_salud = c.id_centro
    WHERE n.id_niño = @id_niño;
END;
GO

-- Update a child
CREATE PROCEDURE sp_ActualizarNino
    @id_niño UNIQUEIDENTIFIER,
    @nombre_completo NVARCHAR(100),
    @identificacion NVARCHAR(50),
    @nacionalidad NVARCHAR(20),
    @pais_nacimiento NVARCHAR(50) = NULL,
    @fecha_nacimiento DATE,
    @genero CHAR(1),
    @direccion_residencia NVARCHAR(200) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @id_centro_salud UNIQUEIDENTIFIER = NULL,
    @contacto_principal NVARCHAR(20) = NULL,
    @id_salud_nacional NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Niños
        SET
            nombre_completo = @nombre_completo,
            identificacion = @identificacion,
            nacionalidad = @nacionalidad,
            pais_nacimiento = @pais_nacimiento,
            fecha_nacimiento = @fecha_nacimiento,
            genero = @genero,
            direccion_residencia = @direccion_residencia,
            latitud = @latitud,
            longitud = @longitud,
            id_centro_salud = @id_centro_salud,
            contacto_principal = @contacto_principal,
            id_salud_nacional = @id_salud_nacional,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_niño = @id_niño;
        IF @@ROWCOUNT = 0
            RAISERROR ('Niño no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a child
CREATE PROCEDURE sp_EliminarNino
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Tutores WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Citas WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Eventos_Adversos WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Alertas WHERE id_niño = @id_niño
        )
            RAISERROR ('No se puede eliminar el niño debido a registros dependientes', 16, 1);

        DELETE FROM Niños WHERE id_niño = @id_niño;
        IF @@ROWCOUNT = 0
            RAISERROR ('Niño no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 4. Tutores
-- Create a new guardian
CREATE PROCEDURE sp_CrearTutor
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @identificacion NVARCHAR(50) = NULL,
    @relacion NVARCHAR(20),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(200) = NULL,
    @nacionalidad NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Tutores (
            id_niño, nombre, identificacion, relacion, telefono, email, direccion, nacionalidad
        )
        VALUES (
            @id_niño, @nombre, @identificacion, @relacion, @telefono, @email, @direccion, @nacionalidad
        );
        SELECT SCOPE_IDENTITY() AS id_tutor;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a guardian by ID
CREATE PROCEDURE sp_ObtenerTutor
    @id_tutor UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        t.*,
        n.nombre_completo AS nombre_niño
    FROM Tutores t
    INNER JOIN Niños n ON t.id_niño = n.id_niño
    WHERE t.id_tutor = @id_tutor;
END;
GO

-- Update a guardian
CREATE PROCEDURE sp_ActualizarTutor
    @id_tutor UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @identificacion NVARCHAR(50) = NULL,
    @relacion NVARCHAR(20),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(200) = NULL,
    @nacionalidad NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Tutores
        SET
            id_niño = @id_niño,
            nombre = @nombre,
            identificacion = @identificacion,
            relacion = @relacion,
            telefono = @telefono,
            email = @email,
            direccion = @direccion,
            nacionalidad = @nacionalidad,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_tutor = @id_tutor;
        IF @@ROWCOUNT = 0
            RAISERROR ('Tutor no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a guardian
CREATE PROCEDURE sp_EliminarTutor
    @id_tutor UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Tutores WHERE id_tutor = @id_tutor;
        IF @@ROWCOUNT = 0
            RAISERROR ('Tutor no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 5. Lotes_Vacunas
-- Create a new vaccine batch
CREATE PROCEDURE sp_CrearLoteVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @numero_lote NVARCHAR(50),
    @fecha_vencimiento DATE = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @temperatura_registrada DECIMAL(5,2) = NULL,
    @fecha_ultima_verificacion DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Lotes_Vacunas (
            id_vacuna, numero_lote, fecha_vencimiento, cantidad_total, cantidad_disponible,
            id_centro, temperatura_registrada, fecha_ultima_verificacion
        )
        VALUES (
            @id_vacuna, @numero_lote, @fecha_vencimiento, @cantidad_total, @cantidad_disponible,
            @id_centro, @temperatura_registrada, @fecha_ultima_verificacion
        );
        SELECT SCOPE_IDENTITY() AS id_lote;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a vaccine batch by ID
CREATE PROCEDURE sp_ObtenerLoteVacuna
    @id_lote UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        l.*,
        v.nombre_vacuna,
        c.nombre_centro
    FROM Lotes_Vacunas l
    INNER JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    INNER JOIN Centros_Vacunacion c ON l.id_centro = c.id_centro
    WHERE l.id_lote = @id_lote;
END;
GO

-- Update a vaccine batch
CREATE PROCEDURE sp_ActualizarLoteVacuna
    @id_lote UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @numero_lote NVARCHAR(50),
    @fecha_vencimiento DATE = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @temperatura_registrada DECIMAL(5,2) = NULL,
    @fecha_ultima_verificacion DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Lotes_Vacunas
        SET
            id_vacuna = @id_vacuna,
            numero_lote = @numero_lote,
            fecha_vencimiento = @fecha_vencimiento,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            id_centro = @id_centro,
            temperatura_registrada = @temperatura_registrada,
            fecha_ultima_verificacion = @fecha_ultima_verificacion,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_lote = @id_lote;
        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccine batch
CREATE PROCEDURE sp_EliminarLoteVacuna
    @id_lote UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM Historial_Vacunacion WHERE id_lote = @id_lote)
            RAISERROR ('No se puede eliminar el lote debido a registros dependientes', 16, 1);

        DELETE FROM Lotes_Vacunas WHERE id_lote = @id_lote;
        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 6. Personal_Salud
-- Create a new healthcare personnel
CREATE PROCEDURE sp_CrearPersonalSalud
    @nombre NVARCHAR(100),
    @cedula NVARCHAR(20),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @id_centro UNIQUEIDENTIFIER,
    @especialidad NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Personal_Salud (
            nombre, cedula, telefono, email, id_centro, especialidad
        )
        VALUES (
            @nombre, @cedula, @telefono, @email, @id_centro, @especialidad
        );
        SELECT SCOPE_IDENTITY() AS id_personal;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get healthcare personnel by ID
CREATE PROCEDURE sp_ObtenerPersonalSalud
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.*,
        c.nombre_centro
    FROM Personal_Salud p
    INNER JOIN Centros_Vacunacion c ON p.id_centro = c.id_centro
    WHERE p.id_personal = @id_personal;
END;
GO

-- Update healthcare personnel
CREATE PROCEDURE sp_ActualizarPersonalSalud
    @id_personal UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @cedula NVARCHAR(20),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @id_centro UNIQUEIDENTIFIER,
    @especialidad NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Personal_Salud
        SET
            nombre = @nombre,
            cedula = @cedula,
            telefono = @telefono,
            email = @email,
            id_centro = @id_centro,
            especialidad = @especialidad,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_personal = @id_personal;
        IF @@ROWCOUNT = 0
            RAISERROR ('Personal no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete healthcare personnel
CREATE PROCEDURE sp_EliminarPersonalSalud
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Historial_Vacunacion WHERE id_personal_responsable = @id_personal
            UNION
            SELECT 1 FROM Eventos_Adversos WHERE id_personal_reportante = @id_personal
        )
            RAISERROR ('No se puede eliminar el personal debido a registros dependientes', 16, 1);

        DELETE FROM Personal_Salud WHERE id_personal = @id_personal;
        IF @@ROWCOUNT = 0
            RAISERROR ('Personal no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 7. Usuarios
-- Create a new user
CREATE PROCEDURE sp_CrearUsuario
    @nombre NVARCHAR(100),
    @rol NVARCHAR(20),
    @id_centro UNIQUEIDENTIFIER = NULL,
    @username NVARCHAR(50),
    @password_hash NVARCHAR(256),
    @email NVARCHAR(100) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Usuarios (
            nombre, rol, id_centro, username, password_hash, email, telefono, estado
        )
        VALUES (
            @nombre, @rol, @id_centro, @username, @password_hash, @email, @telefono, @estado
        );
        SELECT SCOPE_IDENTITY() AS id_usuario;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a user by ID
CREATE PROCEDURE sp_ObtenerUsuario
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.*,
        c.nombre_centro
    FROM Usuarios u
    LEFT JOIN Centros_Vacunacion c ON u.id_centro = c.id_centro
    WHERE u.id_usuario = @id_usuario;
END;
GO

-- Update a user
CREATE PROCEDURE sp_ActualizarUsuario
    @id_usuario UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @rol NVARCHAR(20),
    @id_centro UNIQUEIDENTIFIER = NULL,
    @username NVARCHAR(50),
    @password_hash NVARCHAR(256),
    @email NVARCHAR(100) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Usuarios
        SET
            nombre = @nombre,
            rol = @rol,
            id_centro = @id_centro,
            username = @username,
            password_hash = @password_hash,
            email = @email,
            telefono = @telefono,
            estado = @estado,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_usuario = @id_usuario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Usuario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a user
CREATE PROCEDURE sp_EliminarUsuario
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Auditoria WHERE id_usuario = @id_usuario
            UNION
            SELECT 1 FROM Alertas WHERE id_usuario_asignado = @id_usuario
        )
            RAISERROR ('No se puede eliminar el usuario debido a registros dependientes', 16, 1);

        DELETE FROM Usuarios WHERE id_usuario = @id_usuario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Usuario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 8. Campañas_Vacunacion
-- Create a new vaccination campaign
CREATE PROCEDURE sp_CrearCampanaVacunacion
    @nombre_campaña NVARCHAR(100),
    @fecha_inicio DATE,
    @fecha_fin DATE = NULL,
    @objetivo NVARCHAR(500) = NULL,
    @id_vacuna UNIQUEIDENTIFIER,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Campañas_Vacunacion (
            nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado
        )
        VALUES (
            @nombre_campaña, @fecha_inicio, @fecha_fin, @objetivo, @id_vacuna, @estado
        );
        SELECT SCOPE_IDENTITY() AS id_campaña;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a vaccination campaign by ID
CREATE PROCEDURE sp_ObtenerCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.*,
        v.nombre_vacuna
    FROM Campañas_Vacunacion c
    INNER JOIN Vacunas v ON c.id_vacuna = v.id_vacuna
    WHERE c.id_campaña = @id_campaña;
END;
GO

-- Update a vaccination campaign
CREATE PROCEDURE sp_ActualizarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER,
    @nombre_campaña NVARCHAR(100),
    @fecha_inicio DATE,
    @fecha_fin DATE = NULL,
    @objetivo NVARCHAR(500) = NULL,
    @id_vacuna UNIQUEIDENTIFIER,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Campañas_Vacunacion
        SET
            nombre_campaña = @nombre_campaña,
            fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin,
            objetivo = @objetivo,
            id_vacuna = @id_vacuna,
            estado = @estado,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_campaña = @id_campaña;
        IF @@ROWCOUNT = 0
            RAISERROR ('Campaña no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccination campaign
CREATE PROCEDURE sp_EliminarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Campaña_Centro WHERE id_campaña = @id_campaña
            UNION
            SELECT 1 FROM Citas WHERE id_campaña = @id_campaña
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_campaña = @id_campaña
        )
            RAISERROR ('No se puede eliminar la campaña debido a registros dependientes', 16, 1);

        DELETE FROM Campañas_Vacunacion WHERE id_campaña = @id_campaña;
        IF @@ROWCOUNT = 0
            RAISERROR ('Campaña no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 9. Campaña_Centro
-- Assign a campaign to a center
CREATE PROCEDURE sp_CrearCampanaCentro
    @id_campaña UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_asignacion DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Campaña_Centro (
            id_campaña, id_centro, fecha_asignacion
        )
        VALUES (
            @id_campaña, @id_centro, @fecha_asignacion
        );
        SELECT SCOPE_IDENTITY() AS id_campaña_centro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get campaign-center assignment by ID
CREATE PROCEDURE sp_ObtenerCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        cc.*,
        c.nombre_campaña,
        v.nombre_centro
    FROM Campaña_Centro cc
    INNER JOIN Campañas_Vacunacion c ON cc.id_campaña = c.id_campaña
    INNER JOIN Centros_Vacunacion v ON cc.id_centro = v.id_centro
    WHERE cc.id_campaña_centro = @id_campaña_centro;
END;
GO

-- Delete campaign-center assignment
CREATE PROCEDURE sp_EliminarCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Campaña_Centro WHERE id_campaña_centro = @id_campaña_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Asignación no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 10. Citas
-- Create a new appointment
CREATE PROCEDURE sp_CrearCita
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @id_campaña UNIQUEIDENTIFIER = NULL,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20),
    @vacuna_programada NVARCHAR(100) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Citas (
            id_niño, id_centro, id_campaña, fecha_cita, estado, vacuna_programada, observaciones
        )
        VALUES (
            @id_niño, @id_centro, @id_campaña, @fecha_cita, @estado, @vacuna_programada, @observaciones
        );
        SELECT SCOPE_IDENTITY() AS id_cita;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get an appointment by ID
CREATE PROCEDURE sp_ObtenerCita
    @id_cita UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.*,
        n.nombre_completo AS nombre_niño,
        v.nombre_centro,
        ca.nombre_campaña
    FROM Citas c
    INNER JOIN Niños n ON c.id_niño = n.id_niño
    INNER JOIN Centros_Vacunacion v ON c.id_centro = v.id_centro
    LEFT JOIN Campañas_Vacunacion ca ON c.id_campaña = ca.id_campaña
    WHERE c.id_cita = @id_cita;
END;
GO

-- Update an appointment
CREATE PROCEDURE sp_ActualizarCita
    @id_cita UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @id_campaña UNIQUEIDENTIFIER = NULL,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20),
    @vacuna_programada NVARCHAR(100) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Citas
        SET
            id_niño = @id_niño,
            id_centro = @id_centro,
            id_campaña = @id_campaña,
            fecha_cita = @fecha_cita,
            estado = @estado,
            vacuna_programada = @vacuna_programada,
            observaciones = @observaciones,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_cita = @id_cita;
        IF @@ROWCOUNT = 0
            RAISERROR ('Cita no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete an appointment
CREATE PROCEDURE sp_EliminarCita
    @id_cita UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM Historial_Vacunacion WHERE id_cita = @id_cita)
            RAISERROR ('No se puede eliminar la cita debido a registros dependientes', 16, 1);

        DELETE FROM Citas WHERE id_cita = @id_cita;
        IF @@ROWCOUNT = 0
            RAISERROR ('Cita no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get appointments by center and date range
CREATE PROCEDURE sp_ObtenerCitasPorCentro
    @id_centro UNIQUEIDENTIFIER,
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.id_cita,
        n.nombre_completo AS nombre_niño,
        c.fecha_cita,
        c.estado,
        c.vacuna_programada
    FROM Citas c
    INNER JOIN Niños n ON c.id_niño = n.id_niño
    WHERE c.id_centro = @id_centro
    AND c.fecha_cita BETWEEN @fecha_inicio AND @fecha_fin
    ORDER BY c.fecha_cita;
END;
GO

-- 11. Historial_Vacunacion
-- Register a new vaccination
CREATE PROCEDURE sp_RegistrarVacunacion
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @id_lote UNIQUEIDENTIFIER,
    @id_cita UNIQUEIDENTIFIER = NULL,
    @id_campaña UNIQUEIDENTIFIER = NULL,
    @fecha_aplicacion DATE,
    @tipo_dosis NVARCHAR(20),
    @edad_al_vacunarse INT,
    @id_personal_responsable UNIQUEIDENTIFIER,
    @firma_digital NVARCHAR(200) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Insert into Historial_Vacunacion
        INSERT INTO Historial_Vacunacion (
            id_niño, id_centro, id_vacuna, id_lote, id_cita, id_campaña,
            fecha_aplicacion, tipo_dosis, edad_al_vacunarse, id_personal_responsable,
            firma_digital, observaciones
        )
        VALUES (
            @id_niño, @id_centro, @id_vacuna, @id_lote, @id_cita, @id_campaña,
            @fecha_aplicacion, @tipo_dosis, @edad_al_vacunarse, @id_personal_responsable,
            @firma_digital, @observaciones
        );

        -- Update available quantity in Lotes_Vacunas
        UPDATE Lotes_Vacunas
        SET cantidad_disponible = cantidad_disponible - 1
        WHERE id_lote = @id_lote AND cantidad_disponible > 0;

        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no disponible o sin stock', 16, 1);

        -- Update appointment status if applicable
        IF @id_cita IS NOT NULL
        BEGIN
            UPDATE Citas
            SET estado = 'Completada',
                fecha_actualizacion = SYSDATETIME()
            WHERE id_cita = @id_cita;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get vaccination history by child ID
CREATE PROCEDURE sp_ObtenerHistorialVacunacion
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        h.*,
        v.nombre_vacuna,
        c.nombre_centro,
        p.nombre AS personal_responsable
    FROM Historial_Vacunacion h
    INNER JOIN Vacunas v ON h.id_vacuna = v.id_vacuna
    INNER JOIN Centros_Vacunacion c ON h.id_centro = c.id_centro
    INNER JOIN Personal_Salud p ON h.id_personal_responsable = p.id_personal
    WHERE h.id_niño = @id_niño
    ORDER BY h.fecha_aplicacion DESC;
END;
GO

-- 12. Inventario_Suministros
-- Create a new supply inventory
CREATE PROCEDURE sp_CrearSuministro
    @nombre_suministro NVARCHAR(100),
    @tipo_suministro NVARCHAR(50) = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_entrada DATE,
    @fecha_vencimiento DATE = NULL,
    @proveedor NVARCHAR(100) = NULL,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Inventario_Suministros (
            nombre_suministro, tipo_suministro, cantidad_total, cantidad_disponible,
            id_centro, fecha_entrada, fecha_vencimiento, proveedor, condiciones_almacenamiento
        )
        VALUES (
            @nombre_suministro, @tipo_suministro, @cantidad_total, @cantidad_disponible,
            @id_centro, @fecha_entrada, @fecha_vencimiento, @proveedor, @condiciones_almacenamiento
        );
        SELECT SCOPE_IDENTITY() AS id_suministro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a supply by ID
CREATE PROCEDURE sp_ObtenerSuministro
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        s.*,
        c.nombre_centro
    FROM Inventario_Suministros s
    INNER JOIN Centros_Vacunacion c ON s.id_centro = c.id_centro
    WHERE s.id_suministro = @id_suministro;
END;
GO

-- Update a supply
CREATE PROCEDURE sp_ActualizarSuministro
    @id_suministro UNIQUEIDENTIFIER,
    @nombre_suministro NVARCHAR(100),
    @tipo_suministro NVARCHAR(50) = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_entrada DATE,
    @fecha_vencimiento DATE = NULL,
    @proveedor NVARCHAR(100) = NULL,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Inventario_Suministros
        SET
            nombre_suministro = @nombre_suministro,
            tipo_suministro = @tipo_suministro,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            id_centro = @id_centro,
            fecha_entrada = @fecha_entrada,
            fecha_vencimiento = @fecha_vencimiento,
            proveedor = @proveedor,
            condiciones_almacenamiento = @condiciones_almacenamiento,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_suministro = @id_suministro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a supply
CREATE PROCEDURE sp_EliminarSuministro
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM Suministro_Vacunacion WHERE id_suministro = @id_suministro)
            RAISERROR ('No se puede eliminar el suministro debido a registros dependientes', 16, 1);

        DELETE FROM Inventario_Suministros WHERE id_suministro = @id_suministro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 13. Suministro_Vacunacion
-- Register supply usage for a vaccination
CREATE PROCEDURE sp_RegistrarSuministroVacunacion
    @id_historial UNIQUEIDENTIFIER,
    @id_suministro UNIQUEIDENTIFIER,
    @cantidad_usada INT,
    @fecha_uso DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Insert into Suministro_Vacunacion
        INSERT INTO Suministro_Vacunacion (
            id_historial, id_suministro, cantidad_usada, fecha_uso
        )
        VALUES (
            @id_historial, @id_suministro, @cantidad_usada, @fecha_uso
        );

        -- Update available quantity in Inventario_Suministros
        UPDATE Inventario_Suministros
        SET cantidad_disponible = cantidad_disponible - @cantidad_usada
        WHERE id_suministro = @id_suministro AND cantidad_disponible >= @cantidad_usada;

        IF @@ROWCOUNT = 0
            RAISERROR ('Suministro no disponible o sin stock suficiente', 16, 1);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get supply usage by vaccination history ID
CREATE PROCEDURE sp_ObtenerSuministroVacunacion
    @id_historial UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        sv.*,
        s.nombre_suministro
    FROM Suministro_Vacunacion sv
    INNER JOIN Inventario_Suministros s ON sv.id_suministro = s.id_suministro
    WHERE sv.id_historial = @id_historial;
END;
GO

-- 14. Esquema_Vacunacion
-- Create a new vaccination schedule
CREATE PROCEDURE sp_CrearEsquemaVacunacion
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @intervalo_desde_anterior INT = NULL,
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Esquema_Vacunacion (
            id_vacuna, orden_dosis, edad_recomendada, intervalo_desde_anterior, descripcion
        )
        VALUES (
            @id_vacuna, @orden_dosis, @edad_recomendada, @intervalo_desde_anterior, @descripcion
        );
        SELECT SCOPE_IDENTITY() AS id_esquema;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get a vaccination schedule by ID
CREATE PROCEDURE sp_ObtenerEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        e.*,
        v.nombre_vacuna
    FROM Esquema_Vacunacion e
    INNER JOIN Vacunas v ON e.id_vacuna = v.id_vacuna
    WHERE e.id_esquema = @id_esquema;
END;
GO

-- Update a vaccination schedule
CREATE PROCEDURE sp_ActualizarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @intervalo_desde_anterior INT = NULL,
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Esquema_Vacunacion
        SET
            id_vacuna = @id_vacuna,
            orden_dosis = @orden_dosis,
            edad_recomendada = @edad_recomendada,
            intervalo_desde_anterior = @intervalo_desde_anterior,
            descripcion = @descripcion,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_esquema = @id_esquema;
        IF @@ROWCOUNT = 0
            RAISERROR ('Esquema no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete a vaccination schedule
CREATE PROCEDURE sp_EliminarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema;
        IF @@ROWCOUNT = 0
            RAISERROR ('Esquema no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 15. Auditoria
-- Log an audit entry
CREATE PROCEDURE sp_RegistrarAuditoria
    @tabla_afectada NVARCHAR(50),
    @id_registro UNIQUEIDENTIFIER,
    @id_usuario UNIQUEIDENTIFIER,
    @accion NVARCHAR(20),
    @detalles NVARCHAR(500) = NULL,
    @ip_origen NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Auditoria (
            tabla_afectada, id_registro, id_usuario, accion, detalles, ip_origen, fecha_hora
        )
        VALUES (
            @tabla_afectada, @id_registro, @id_usuario, @accion, @detalles, @ip_origen, SYSDATETIME()
        );
        SELECT SCOPE_IDENTITY() AS id_auditoria;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get audit logs by user or table
CREATE PROCEDURE sp_ObtenerAuditoria
    @id_usuario UNIQUEIDENTIFIER = NULL,
    @tabla_afectada NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        a.*,
        u.nombre AS nombre_usuario
    FROM Auditoria a
    INNER JOIN Usuarios u ON a.id_usuario = u.id_usuario
    WHERE (@id_usuario IS NULL OR a.id_usuario = @id_usuario)
    AND (@tabla_afectada IS NULL OR a.tabla_afectada = @tabla_afectada)
    ORDER BY a.fecha_hora DESC;
END;
GO

-- 16. Eventos_Adversos
-- Report an adverse event
CREATE PROCEDURE sp_RegistrarEventoAdverso
    @id_niño UNIQUEIDENTIFIER,
    @id_historial UNIQUEIDENTIFIER,
    @descripcion_evento NVARCHAR(500),
    @fecha_evento DATE,
    @gravedad NVARCHAR(20),
    @id_personal_reportante UNIQUEIDENTIFIER,
    @acciones_tomadas NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Eventos_Adversos (
            id_niño, id_historial, descripcion_evento, fecha_evento, gravedad,
            id_personal_reportante, acciones_tomadas, estado
        )
        VALUES (
            @id_niño, @id_historial, @descripcion_evento, @fecha_evento, @gravedad,
            @id_personal_reportante, @acciones_tomadas, @estado
        );
        SELECT SCOPE_IDENTITY() AS id_evento;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get an adverse event by ID
CREATE PROCEDURE sp_ObtenerEventoAdverso
    @id_evento UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        e.*,
        n.nombre_completo AS nombre_niño,
        p.nombre AS personal_reportante
    FROM Eventos_Adversos e
    INNER JOIN Niños n ON e.id_niño = n.id_niño
    INNER JOIN Personal_Salud p ON e.id_personal_reportante = p.id_personal
    WHERE e.id_evento = @id_evento;
END;
GO

-- Update an adverse event
CREATE PROCEDURE sp_ActualizarEventoAdverso
    @id_evento UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_historial UNIQUEIDENTIFIER,
    @descripcion_evento NVARCHAR(500),
    @fecha_evento DATE,
    @gravedad NVARCHAR(20),
    @id_personal_reportante UNIQUEIDENTIFIER,
    @acciones_tomadas NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Eventos_Adversos
        SET
            id_niño = @id_niño,
            id_historial = @id_historial,
            descripcion_evento = @descripcion_evento,
            fecha_evento = @fecha_evento,
            gravedad = @gravedad,
            id_personal_reportante = @id_personal_reportante,
            acciones_tomadas = @acciones_tomadas,
            estado = @estado,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_evento = @id_evento;
        IF @@ROWCOUNT = 0
            RAISERROR ('Evento adverso no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete an adverse event
CREATE PROCEDURE sp_EliminarEventoAdverso
    @id_evento UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM Alertas WHERE id_evento = @id_evento)
            RAISERROR ('No se puede eliminar el evento adverso debido a alertas asociadas', 16, 1);

        DELETE FROM Eventos_Adversos WHERE id_evento = @id_evento;
        IF @@ROWCOUNT = 0
            RAISERROR ('Evento adverso no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 17. Alertas
-- Create a new alert
CREATE PROCEDURE sp_CrearAlerta
    @id_niño UNIQUEIDENTIFIER,
    @id_evento UNIQUEIDENTIFIER = NULL,
    @tipo_alerta NVARCHAR(20),
    @fecha_alerta DATE,
    @mensaje NVARCHAR(500) = NULL,
    @estado NVARCHAR(20),
    @id_usuario_asignado UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO Alertas (
            id_niño, id_evento, tipo_alerta, fecha_alerta, mensaje, estado, id_usuario_asignado
        )
        VALUES (
            @id_niño, @id_evento, @tipo_alerta, @fecha_alerta, @mensaje, @estado, @id_usuario_asignado
        );
        SELECT SCOPE_IDENTITY() AS id_alerta;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Get an alert by ID
CREATE PROCEDURE sp_ObtenerAlerta
    @id_alerta UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        a.*,
        n.nombre_completo AS nombre_niño,
        u.nombre AS usuario_asignado
    FROM Alertas a
    INNER JOIN Niños n ON a.id_niño = n.id_niño
    LEFT JOIN Usuarios u ON a.id_usuario_asignado = u.id_usuario
    WHERE a.id_alerta = @id_alerta;
END;
GO

-- Update an alert
CREATE PROCEDURE sp_ActualizarAlerta
    @id_alerta UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_evento UNIQUEIDENTIFIER = NULL,
    @tipo_alerta NVARCHAR(20),
    @fecha_alerta DATE,
    @mensaje NVARCHAR(500) = NULL,
    @estado NVARCHAR(20),
    @id_usuario_asignado UNIQUEIDENTIFIER = NULL,
    @fecha_resolucion DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Alertas
        SET
            id_niño = @id_niño,
            id_evento = @id_evento,
            tipo_alerta = @tipo_alerta,
            fecha_alerta = @fecha_alerta,
            mensaje = @mensaje,
            estado = @estado,
            id_usuario_asignado = @id_usuario_asignado,
            fecha_resolucion = @fecha_resolucion,
            fecha_actualizacion = SYSDATETIME()
        WHERE id_alerta = @id_alerta;
        IF @@ROWCOUNT = 0
            RAISERROR ('Alerta no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- Delete an alert
CREATE PROCEDURE sp_EliminarAlerta
    @id_alerta UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Alertas WHERE id_alerta = @id_alerta;
        IF @@ROWCOUNT = 0
            RAISERROR ('Alerta no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

-- 18. Additional Reporting Stored Procedures
-- Get vaccination coverage by center
CREATE PROCEDURE sp_ObtenerCoberturaVacunacion
    @id_centro UNIQUEIDENTIFIER,
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.nombre_vacuna,
        COUNT(h.id_historial) AS total_vacunados,
        COUNT(DISTINCT h.id_niño) AS niños_vacunados
    FROM Historial_Vacunacion h
    INNER JOIN Vacunas v ON h.id_vacuna = v.id_vacuna
    WHERE h.id_centro = @id_centro
    AND h.fecha_aplicacion BETWEEN @fecha_inicio AND @fecha_fin
    GROUP BY v.nombre_vacuna
    ORDER BY v.nombre_vacuna;
END;
GO

-- Get pending appointments by child
CREATE PROCEDURE sp_ObtenerCitasPendientesNino
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.id_cita,
        c.fecha_cita,
        c.vacuna_programada,
        v.nombre_centro
    FROM Citas c
    INNER JOIN Centros_Vacunacion v ON c.id_centro = v.id_centro
    WHERE c.id_niño = @id_niño
    AND c.estado IN ('Pendiente', 'Confirmada')
    AND c.fecha_cita >= GETDATE()
    ORDER BY c.fecha_cita;
END;
GO

-- Get expired vaccine batches
CREATE PROCEDURE sp_ObtenerLotesVencidos
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        l.id_lote,
        l.numero_lote,
        v.nombre_vacuna,
        l.fecha_vencimiento,
        l.cantidad_disponible
    FROM Lotes_Vacunas l
    INNER JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    WHERE l.id_centro = @id_centro
    AND l.fecha_vencimiento < GETDATE()
    AND l.cantidad_disponible > 0
    ORDER BY l.fecha_vencimiento;
END;
GO

-- Get incomplete vaccination schedules
CREATE PROCEDURE sp_ObtenerEsquemasIncompletos
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.nombre_vacuna,
        e.orden_dosis,
        e.edad_recomendada
    FROM Esquema_Vacunacion e
    INNER JOIN Vacunas v ON e.id_vacuna = v.id_vacuna
    WHERE NOT EXISTS (
        SELECT 1 
        FROM Historial_Vacunacion h 
        WHERE h.id_niño = @id_niño 
        AND h.id_vacuna = e.id_vacuna 
        AND h.tipo_dosis = CAST(e.orden_dosis AS NVARCHAR(20))
    )
    ORDER BY v.nombre_vacuna, e.orden_dosis;
END;
GO